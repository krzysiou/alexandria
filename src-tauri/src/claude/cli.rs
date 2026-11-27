use std::{
    collections::BTreeSet,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Mutex,
    time::Duration,
};

use anyhow::{anyhow, bail, Context, Result};
use serde::Serialize;
use serde_json::Value;
use tokio::{io::AsyncWriteExt, process::Command, time::timeout};

use crate::{
    storage::{paths, usage::UsageLimits},
    system::terminal,
};

static RUNNING: Mutex<BTreeSet<u32>> = Mutex::new(BTreeSet::new());

struct RunningGuard(u32);

impl RunningGuard {
    /// Records a running `claude` process group so it can be stopped on quit.
    fn register(pid: u32) -> Self {
        RUNNING.lock().expect("running lock").insert(pid);
        Self(pid)
    }
}

impl Drop for RunningGuard {
    /// Forgets the process once its call finished or was cancelled.
    fn drop(&mut self) {
        RUNNING.lock().expect("running lock").remove(&self.0);
    }
}

/// Stops every `claude` process still parsing. Called when the app quits:
/// exiting skips destructors, so without this the calls would keep running
/// (and using the plan) with nobody waiting for their results.
pub fn stop_all() {
    let pids: Vec<u32> = RUNNING.lock().map(|running| running.iter().copied().collect()).unwrap_or_default();
    for pid in pids {
        if let Ok(group) = i32::try_from(pid) {
            unsafe {
                libc::kill(-group, libc::SIGTERM);
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct ClaudeEnv {
    pub bin: PathBuf,
    pub path_env: String,
}

#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStatus {
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub logged_in: bool,
    pub email: Option<String>,
    pub auth_method: Option<String>,
    pub subscription: Option<String>,
    pub error: Option<String>,
}

async fn user_shell() -> String {
    if let Ok(shell) = std::env::var("SHELL") {
        if !shell.is_empty() {
            return shell;
        }
    }
    let user = std::env::var("USER").unwrap_or_default();
    if !user.is_empty() {
        let out =
            Command::new("/usr/bin/dscl").args([".", "-read", &format!("/Users/{user}"), "UserShell"]).output().await;
        if let Ok(out) = out {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(shell) = text.split_whitespace().nth(1) {
                return shell.to_string();
            }
        }
    }
    "/bin/zsh".to_string()
}

/// PATH as seen by the user's login (and interactive) shell.
async fn login_shell_path() -> Option<String> {
    let shell = user_shell().await;
    for interactive in [true, false] {
        let mut cmd = Command::new(&shell);
        cmd.arg("-l");
        if interactive {
            cmd.arg("-i");
        }
        cmd.args(["-c", "/usr/bin/env"])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        if let Ok(Ok(out)) = timeout(Duration::from_secs(8), cmd.output()).await {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(path) = text.lines().rev().find_map(|l| l.strip_prefix("PATH=")) {
                if !path.trim().is_empty() {
                    return Some(path.trim().to_string());
                }
            }
        }
    }
    None
}

fn is_executable(path: &Path) -> bool {
    std::fs::metadata(path).map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0).unwrap_or(false)
}

fn expand_home(path: &str) -> PathBuf {
    match path.strip_prefix("~/") {
        Some(rest) => paths::home_dir().join(rest),
        None => PathBuf::from(path),
    }
}

fn fallback_dirs() -> Vec<String> {
    let home = paths::home_dir();
    let mut dirs: Vec<PathBuf> = vec![
        home.join(".local/bin"),
        home.join(".claude/local"),
        home.join(".npm-global/bin"),
        home.join(".bun/bin"),
        home.join(".volta/bin"),
        home.join(".asdf/shims"),
        home.join(".local/share/mise/shims"),
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
    ];
    for root in [home.join(".nvm/versions/node"), home.join(".local/share/fnm/node-versions")] {
        if let Ok(entries) = std::fs::read_dir(&root) {
            let mut versions: Vec<PathBuf> = entries.flatten().map(|e| e.path()).collect();
            versions.sort();
            versions.reverse();
            for version in versions {
                dirs.push(version.join("bin"));
                dirs.push(version.join("installation/bin"));
            }
        }
    }
    dirs.into_iter()
        .map(|d| d.to_string_lossy().into_owned())
        .chain(["/usr/bin", "/bin", "/usr/sbin", "/sbin"].map(String::from))
        .collect()
}

/// PATH a terminal would have: the login shell's PATH followed by the usual
/// install locations of developer tools, without duplicates.
pub async fn shell_path() -> String {
    let mut dirs: Vec<String> = Vec::new();
    if let Some(path) = login_shell_path().await {
        dirs.extend(path.split(':').map(String::from));
    }
    dirs.extend(fallback_dirs());

    let mut seen = std::collections::HashSet::new();
    dirs.retain(|d| !d.is_empty() && seen.insert(d.clone()));
    dirs.join(":")
}

/// Finds the `claude` binary (or validates `custom_path`) and the PATH it
/// should run with.
pub async fn resolve(custom_path: &str) -> Result<ClaudeEnv> {
    let path_env = shell_path().await;

    let bin = if custom_path.trim().is_empty() {
        path_env
            .split(':')
            .map(|dir| Path::new(dir).join("claude"))
            .find(|candidate| is_executable(candidate))
            .ok_or_else(|| anyhow!("Claude Code CLI (`claude`) was not found on this Mac"))?
    } else {
        let bin = expand_home(custom_path.trim());
        if !is_executable(&bin) {
            bail!("{} is not an executable file", bin.display());
        }
        bin
    };

    Ok(ClaudeEnv { bin, path_env })
}

/// `claude` with the resolved PATH and piped output; killed when dropped.
fn base_command(env: &ClaudeEnv) -> Command {
    let mut cmd = Command::new(&env.bin);
    cmd.env("PATH", &env.path_env)
        .env_remove("CLAUDECODE")
        .env_remove("CLAUDE_CODE_ENTRYPOINT")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    cmd
}

/// Runs a short `claude` subcommand and returns trimmed stdout and stderr.
async fn run_simple(env: &ClaudeEnv, args: &[&str], secs: u64) -> Result<(String, String)> {
    let mut cmd = base_command(env);
    cmd.args(args).current_dir(paths::data_dir());
    let out = timeout(Duration::from_secs(secs), cmd.output())
        .await
        .map_err(|_| anyhow!("`claude {}` timed out", args.join(" ")))??;
    Ok((
        String::from_utf8_lossy(&out.stdout).trim().to_string(),
        String::from_utf8_lossy(&out.stderr).trim().to_string(),
    ))
}

/// Fills login details from `claude auth status --json`.
async fn read_auth(env: &ClaudeEnv, status: &mut ClaudeStatus) {
    let (out, err) = match run_simple(env, &["auth", "status", "--json"], 30).await {
        Ok(output) => output,
        Err(error) => {
            status.error = Some(format!("{error:#}"));
            return;
        }
    };

    let Ok(json) = serde_json::from_str::<Value>(&out) else {
        let detail = if err.is_empty() { out } else { err };
        status.error =
            Some(format!("Could not read the login status. Update Claude Code to the latest version. {detail}"));
        return;
    };

    let text = |key: &str| json.get(key).and_then(Value::as_str).map(String::from);
    status.logged_in = json.get("loggedIn").and_then(Value::as_bool).unwrap_or(false);
    status.email = text("email");
    status.auth_method = text("authMethod");
    status.subscription = text("subscriptionType");
}

/// Whether Claude Code is installed and signed in, plus where it was found.
/// The returned environment is cached and reused for parsing.
pub async fn status(custom_path: &str) -> (Option<ClaudeEnv>, ClaudeStatus) {
    let env = match resolve(custom_path).await {
        Ok(env) => env,
        Err(error) => return (None, ClaudeStatus { error: Some(format!("{error:#}")), ..Default::default() }),
    };

    let mut status = ClaudeStatus { installed: true, path: Some(env.bin.display().to_string()), ..Default::default() };
    if let Ok((out, _)) = run_simple(&env, &["--version"], 20).await {
        status.version = out.lines().next().map(String::from);
    }
    read_auth(&env, &mut status).await;

    (Some(env), status)
}

/// Opens Terminal running `claude auth login`.
pub fn open_login(env: &ClaudeEnv) -> Result<()> {
    terminal::run_script(
        &paths::run_dir(),
        "claude-login",
        Some(&env.path_env),
        &format!(
            "echo \"Signing in to Claude for Alexandria…\"\necho\n{} auth login",
            terminal::shell_quote(&env.bin.to_string_lossy())
        ),
    )
}

/// Opens Terminal running the official Claude Code installer.
pub fn open_install() -> Result<()> {
    let path = format!("{}/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin", paths::home_dir().display());
    terminal::run_script(
        &paths::run_dir(),
        "claude-install",
        Some(&path),
        "echo \"Installing Claude Code (official installer from claude.ai)…\"\necho\ncurl -fsSL https://claude.ai/install.sh | bash",
    )
}

pub struct Request<'a> {
    pub model: &'a str,
    pub system: &'a str,
    pub prompt: String,
    pub schema: &'a Value,
    pub allow_read: bool,
    pub cwd: &'a Path,
    pub timeout: Duration,
    pub max_budget_usd: Option<f64>,
}

pub struct Response {
    pub output: Value,
    pub cost_usd: f64,
    pub limits: Option<UsageLimits>,
}

/// Usage limits from a `rate_limit_event` of the stream output.
pub fn read_limits(event: &Value) -> Option<UsageLimits> {
    let windows = event.get("rate_limit_info")?.get("unifiedWindows")?;
    let five_hour = windows.get("five_hour")?;
    let seven_day = windows.get("seven_day");

    Some(UsageLimits {
        five_hour: five_hour.get("utilization")?.as_f64()?,
        five_hour_resets_at: five_hour.get("resetsAt")?.as_i64()?,
        seven_day: seven_day.and_then(|w| w.get("utilization")).and_then(Value::as_f64),
        seven_day_resets_at: seven_day.and_then(|w| w.get("resetsAt")).and_then(Value::as_i64),
    })
}

/// Reads the newline-delimited JSON printed by `claude -p --output-format
/// stream-json`: the final `result` (schema-validated `structured_output`,
/// cost) and the latest usage limits.
pub fn parse_response(stdout: &str, stderr: &str) -> Result<Response> {
    let mut result: Option<Value> = None;
    let mut limits: Option<UsageLimits> = None;

    for line in stdout.lines() {
        let Ok(message) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        match message.get("type").and_then(Value::as_str) {
            Some("rate_limit_event") => limits = read_limits(&message).or(limits),
            Some("result") => result = Some(message),
            _ => {}
        }
    }

    let Some(json) = result else {
        let detail = if stderr.trim().is_empty() { stdout.trim() } else { stderr.trim() };
        bail!("Claude returned an unexpected response: {}", truncate(detail, 400));
    };

    let result_text = json.get("result").and_then(Value::as_str).unwrap_or_default();
    if json.get("is_error").and_then(Value::as_bool).unwrap_or(false) {
        bail!("Claude error: {}", truncate(result_text, 400));
    }

    let output = match json.get("structured_output") {
        Some(value) if !value.is_null() => value.clone(),
        _ => serde_json::from_str(result_text).map_err(|_| anyhow!("Claude did not return structured output"))?,
    };
    let cost_usd = json.get("total_cost_usd").and_then(Value::as_f64).unwrap_or(0.0);
    Ok(Response { output, cost_usd, limits })
}

/// Runs `claude -p` headlessly with the prompt on stdin and returns its
/// structured output. Tools are disabled except Read for scanned PDFs.
///
/// Every call is a fresh, one-off session, so it is kept lean to save the
/// plan's usage limits: no MCP servers or skills are loaded, Claude Code's
/// background model calls are off, and prompt caching is off for single-turn
/// calls because their prompt is sent once and a cache write costs more than
/// plain input. Calls that read the PDF take several turns, so they keep it.
pub async fn run_structured(env: &ClaudeEnv, req: Request<'_>) -> Result<Response> {
    let schema = serde_json::to_string(req.schema)?;

    let mut cmd = base_command(env);
    if !req.allow_read {
        cmd.env("DISABLE_PROMPT_CACHING", "1");
    }
    cmd.env("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1")
        .args(["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence"])
        .args(["--strict-mcp-config", "--disable-slash-commands"])
        .args(["--model", req.model])
        .args(["--system-prompt", req.system])
        .args(["--json-schema", &schema]);
    if let Some(budget) = req.max_budget_usd {
        cmd.args(["--max-budget-usd", &format!("{budget:.2}")]);
    }
    if req.allow_read {
        cmd.args(["--tools", "Read", "--allowedTools", "Read"]);
    } else {
        cmd.args(["--tools", ""]);
    }
    cmd.current_dir(req.cwd).stdin(Stdio::piped()).process_group(0);

    let mut child = cmd.spawn().context("starting claude")?;
    let _running = child.id().map(RunningGuard::register);
    let mut stdin = child.stdin.take().context("claude stdin")?;
    let prompt = req.prompt;
    let writer = tokio::spawn(async move {
        let _ = stdin.write_all(prompt.as_bytes()).await;
        let _ = stdin.shutdown().await;
    });

    let out = timeout(req.timeout, child.wait_with_output())
        .await
        .map_err(|_| anyhow!("Claude did not finish within {} minutes", req.timeout.as_secs() / 60))??;
    let _ = writer.await;

    parse_response(&String::from_utf8_lossy(&out.stdout), &String::from_utf8_lossy(&out.stderr))
}

/// Shortens long error output for display.
fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        text.to_string()
    } else {
        format!("{}…", text.chars().take(max).collect::<String>())
    }
}
