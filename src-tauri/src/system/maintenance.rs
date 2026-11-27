use std::{
    fs::File,
    os::unix::{fs::PermissionsExt, process::CommandExt},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    time::Duration,
};

use anyhow::{bail, Context, Result};
use serde::Serialize;
use tauri::{path::BaseDirectory, AppHandle, Manager};

use crate::{app::state::AppState, claude::cli};

const ACTIONS: [&str; 3] = ["update", "reset", "uninstall"];
const READY_MARKER: &str = "::ready-to-install";
const LOG_LINES: usize = 200;
const QUIT_DELAY: Duration = Duration::from_millis(800);

pub struct MaintenanceRun {
    action: String,
    child: Child,
    log: PathBuf,
    exiting: bool,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceProgress {
    pub action: Option<String>,
    pub lines: Vec<String>,
    pub running: bool,
    pub ready_to_install: bool,
    pub failed: bool,
}

/// Repository the running app was built from. It is baked in at compile time,
/// which is what lets "Update" rebuild the app from the same checkout.
pub fn source_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).parent().map(Path::to_path_buf).unwrap_or_default()
}

/// Whether the source checkout is still where the app was built from.
pub fn can_update() -> bool {
    source_dir().join("scripts/install.sh").is_file()
}

/// Finds `maintenance.sh`: bundled inside the app, or in the source checkout
/// when running in development.
fn bundled_script(app: &AppHandle) -> Result<PathBuf> {
    if let Ok(path) = app.path().resolve("maintenance.sh", BaseDirectory::Resource) {
        if path.is_file() {
            return Ok(path);
        }
    }

    let from_source = source_dir().join("scripts/maintenance.sh");
    if from_source.is_file() {
        return Ok(from_source);
    }
    bail!("The maintenance script is missing from this installation")
}

/// Copies the script to a temporary folder, because reset and uninstall
/// delete the folders it would otherwise live in.
fn prepare_script(app: &AppHandle, work_dir: &Path) -> Result<PathBuf> {
    std::fs::create_dir_all(work_dir)?;

    let script = work_dir.join("maintenance.sh");
    std::fs::copy(bundled_script(app)?, &script).context("preparing the maintenance script")?;
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755))?;
    Ok(script)
}

/// Quits the app shortly, letting the current command return first.
fn quit_soon(app: &AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(QUIT_DELAY);
        handle.exit(0);
    });
}

/// Restarts the app shortly. Used when an update was installed while this
/// (old) instance kept running, so the new version starts instead.
fn restart_soon(app: &AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(QUIT_DELAY);
        handle.restart();
    });
}

/// Starts `update`, `reset` or `uninstall` from `scripts/maintenance.sh` as a
/// detached background process (no Terminal) that logs to a file and outlives
/// the app. Reset and uninstall quit the app right away; the script waits for
/// it to exit before touching any files. Update keeps the app running while it
/// builds, see [`progress`].
pub async fn start(app: &AppHandle, action: &str) -> Result<()> {
    if !ACTIONS.contains(&action) {
        bail!("Unknown maintenance action: {action}");
    }
    if action == "update" && !can_update() {
        bail!(
            "The source code is no longer at {}. Clone the repository and run ./scripts/install.sh from it.",
            source_dir().display()
        );
    }

    let path_env = cli::shell_path().await;
    let state = app.state::<AppState>();
    let mut current = state.maintenance.lock().expect("maintenance lock");
    if let Some(run) = current.as_mut() {
        if run.child.try_wait()?.is_none() {
            bail!("Another maintenance action is still running");
        }
    }

    let work_dir = std::env::temp_dir().join("alexandria-maintenance");
    let script = prepare_script(app, &work_dir)?;
    let log = work_dir.join(format!("{action}.log"));
    let log_file = File::create(&log)?;

    let child = Command::new("/bin/bash")
        .arg(&script)
        .args([action, "--yes", "--repo"])
        .arg(source_dir())
        .current_dir(&work_dir)
        .env("PATH", path_env)
        .stdin(Stdio::null())
        .stdout(log_file.try_clone()?)
        .stderr(log_file)
        .process_group(0)
        .spawn()
        .context("starting the maintenance script")?;

    *current = Some(MaintenanceRun { action: action.to_string(), child, log, exiting: false });
    drop(current);

    if action != "update" {
        quit_soon(app);
    }
    Ok(())
}

/// Removes terminal colour codes from a log line.
fn strip_ansi(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut chars = line.chars();
    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            for next in chars.by_ref() {
                if next.is_ascii_alphabetic() {
                    break;
                }
            }
        } else if ch != '\r' {
            out.push(ch);
        }
    }
    out
}

/// Progress of the running action: the end of its log and whether it finished.
/// When an update has built the new version, the app quits so the script can
/// replace it and reopen it; if the script already installed it, the app
/// restarts into the new version instead.
pub fn progress(app: &AppHandle) -> Result<MaintenanceProgress> {
    let state = app.state::<AppState>();
    let mut current = state.maintenance.lock().expect("maintenance lock");
    let Some(run) = current.as_mut() else {
        return Ok(MaintenanceProgress::default());
    };

    let status = run.child.try_wait()?;
    let text = std::fs::read_to_string(&run.log).unwrap_or_default();
    let ready_to_install = text.lines().any(|line| line.trim() == READY_MARKER);

    let lines: Vec<String> =
        text.lines().map(strip_ansi).filter(|line| !line.trim().is_empty() && line.trim() != READY_MARKER).collect();
    let lines = lines[lines.len().saturating_sub(LOG_LINES)..].to_vec();

    let succeeded = status.is_some_and(|code| code.success());
    if ready_to_install && !run.exiting {
        run.exiting = true;
        if succeeded {
            restart_soon(app);
        } else if status.is_none() {
            quit_soon(app);
        }
    }

    Ok(MaintenanceProgress {
        action: Some(run.action.clone()),
        lines,
        running: status.is_none(),
        ready_to_install,
        failed: status.is_some_and(|code| !code.success()),
    })
}
