# Installation & maintenance

## Requirements

- macOS 11 or newer (Apple silicon or Intel)
- Xcode Command Line Tools (`xcode-select --install`) — the script opens the installer if they are missing
- An internet connection for the first build
- A Claude account (subscription or Anthropic Console) — only needed to parse books

Node.js and Rust are **not** required up front. The install script uses them from your system when they are
recent enough (Node ≥ 22.12, Rust ≥ 1.85) and otherwise downloads private copies into `.tooling/` inside the
repository. It never edits your shell profile or system folders.

## Install

```sh
git clone <repository-url> alexandria
cd alexandria
./scripts/install.sh            # add --open to launch the app afterwards
```

What the script does, in order:

1. Checks that it runs on macOS from this repository.
2. Checks the Xcode Command Line Tools (needed to compile).
3. Uses system Node.js or downloads the version from `.nvmrc` (checksum verified) into `.tooling/`.
4. Uses system Rust or installs a private rustup toolchain into `.tooling/`.
5. Installs JavaScript dependencies with `npm ci` (skipped when already up to date).
6. Builds the app bundle with `tauri build --bundles app`.
7. Quits a running Alexandria, then replaces `/Applications/Alexandria.app` (asks for your password only if
   `/Applications` is not writable by you).
8. Creates `~/.alexandria` if needed.

The script is **idempotent**: running it again rebuilds and reinstalls, and it reports whether it installed,
reinstalled or updated (with the version change). Your library in `~/.alexandria` is never touched.

The first build compiles the Rust core and takes a few minutes; later builds are incremental.

## First launch

On startup Alexandria checks that Claude Code is installed and signed in. When it is, the app opens directly.
Otherwise a setup screen offers to install Claude Code (official installer, in Terminal) and to sign in. It
re-checks every few seconds, so finishing those steps in Terminal is enough. See
[Claude connection](claude-connection.md).

## Update, reset, uninstall

All three are available in **Settings → Maintenance** and from the command line. Both routes run the same
script, [`scripts/maintenance.sh`](../scripts/maintenance.sh), which is also bundled inside the app.

| Action | In the app | Command line | Effect |
| --- | --- | --- | --- |
| Update | Settings → Maintenance → Update | `./scripts/install.sh --update` | Pulls the latest source (git checkouts with an upstream), rebuilds, reinstalls and relaunches. Data is kept. |
| Reset data | Settings → Maintenance → Reset | `./scripts/install.sh --reset` | Deletes `~/.alexandria` (books, notes, tests, settings). The app stays installed and reopens empty. |
| Uninstall | Settings → Maintenance → Uninstall | `./scripts/install.sh --uninstall` | Deletes `~/.alexandria`, the app's macOS caches and `/Applications/Alexandria.app`. |

How the in-app actions work:

- Nothing opens in Terminal. The app pauses running parse jobs (their progress is saved), copies
  `maintenance.sh` to a temporary folder and starts it as a detached background process that logs to
  `$TMPDIR/alexandria-maintenance/<action>.log`. The process keeps running after the app quits.
- **Update** keeps the app open and shows a progress window (getting the latest version, building, installing)
  with the build output under *Details*. Once the new version is built the script prints `::ready-to-install`;
  the app then quits itself, the script installs the new bundle and reopens Alexandria. If the build fails,
  the app stays as it was and shows the error.
- **Reset** and **Uninstall** show a short notice and quit the app; the script waits until it has exited
  before deleting anything. Reset reopens Alexandria with an empty library.
- When `/Applications` is not writable by you, macOS shows its standard administrator password dialog.
- "Update" needs the source repository the app was built from. Its path is baked into the app at build time;
  if the repository was moved or deleted, Settings explains where it expected it.
- From the command line, reset and uninstall ask you to type `yes`. Pass `--yes` to
  `scripts/maintenance.sh` to skip that.

The install script can also run in two halves, which is what in-app updates use: `--build-only` builds the
bundle while the app keeps running, and `--install-only` installs an already built bundle.

## What gets installed where

| Path | Contents |
| --- | --- |
| `/Applications/Alexandria.app` | The app |
| `~/.alexandria/` | All app data — see [Data storage](data-storage.md) |
| `~/Library/WebKit/app.alexandria.desktop`, `~/Library/Caches/app.alexandria.desktop` | Web view caches created by macOS (removed by uninstall) |
| `<repo>/.tooling/` | Private Node.js / Rust, only when your system had none (safe to delete) |
| `<repo>/src-tauri/target/` | Build output (safe to delete; the next build takes longer) |
