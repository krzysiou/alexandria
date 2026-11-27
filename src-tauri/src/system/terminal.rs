use std::{os::unix::fs::PermissionsExt, path::Path};

use anyhow::{Context, Result};

/// Quotes a value for safe use inside a bash script.
pub fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', r"'\''"))
}

/// Writes `body` to `<dir>/<name>.command` and opens it, which runs it in a new
/// Terminal window. Used for interactive steps (signing in to Claude,
/// installing it) and for maintenance that has to outlive the app.
/// When `path_env` is None the script inherits the PATH of the user's shell.
pub fn run_script(dir: &Path, name: &str, path_env: Option<&str>, body: &str) -> Result<()> {
    std::fs::create_dir_all(dir)?;

    let path_line = path_env.map(|path| format!("export PATH={}\n", shell_quote(path))).unwrap_or_default();
    let script =
        format!("#!/bin/bash\n{path_line}clear\n{body}\necho\necho \"All done — you can close this window.\"\n");

    let file = dir.join(format!("{name}.command"));
    std::fs::write(&file, script)?;
    std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o755))?;

    std::process::Command::new("/usr/bin/open").arg(&file).status().context("opening Terminal")?;
    Ok(())
}
