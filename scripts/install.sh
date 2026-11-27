#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Alexandria"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLING_DIR="$REPO_DIR/.tooling"
INSTALL_DIR="/Applications"
APP_PATH="$INSTALL_DIR/$APP_NAME.app"
BUILT_APP="$REPO_DIR/src-tauri/target/release/bundle/macos/$APP_NAME.app"
DATA_DIR="$HOME/.alexandria"
MIN_NODE="22.12.0"
MIN_RUST="1.85.0"
MAINTENANCE="$REPO_DIR/scripts/maintenance.sh"
OPEN_AFTER_INSTALL=false
STEPS="all"

if [[ -t 1 ]]; then
  BLUE=$'\033[1;34m' GREEN=$'\033[1;32m' YELLOW=$'\033[1;33m' RED=$'\033[1;31m' BOLD=$'\033[1m' RESET=$'\033[0m'
else
  BLUE="" GREEN="" YELLOW="" RED="" BOLD="" RESET=""
fi

info() { printf '%s==>%s %s\n' "$BLUE" "$RESET" "$*"; }
success() { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
fail() {
  printf '%s✗%s %s\n' "$RED" "$RESET" "$*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage: ./scripts/install.sh [--open] [--build-only | --install-only] [--update | --reset | --uninstall] [--help]

Builds $APP_NAME from this repository and installs it to $APP_PATH.
Running it again updates an existing installation. It is safe to re-run,
and your library in $DATA_DIR is always kept.

  --open          Launch $APP_NAME when the installation finishes
  --build-only    Only build the app bundle (used by in-app updates)
  --install-only  Only install an already built bundle (used by in-app updates)
  --update        Pull the latest source (git), rebuild, reinstall and launch
  --reset         Delete all app data in $DATA_DIR (the app stays installed)
  --uninstall     Delete all app data and remove $APP_PATH
  --help          Show this help

Node.js and Rust are used from your system when recent enough
(Node >= $MIN_NODE, Rust >= $MIN_RUST). Otherwise they are downloaded
into $TOOLING_DIR, without changing your system or shell profile.
EOF
}

parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --open) OPEN_AFTER_INSTALL=true ;;
      --build-only) STEPS="build" ;;
      --install-only) STEPS="install" ;;
      --update) exec "$MAINTENANCE" update --repo "$REPO_DIR" ;;
      --reset) exec "$MAINTENANCE" reset ;;
      --uninstall) exec "$MAINTENANCE" uninstall ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) fail "Unknown option: $arg (see ./scripts/install.sh --help)" ;;
    esac
  done
}

version_ge() {
  local IFS=.
  local -a have=($1) need=($2)
  local i
  for i in 0 1 2; do
    if ((${have[i]:-0} > ${need[i]:-0})); then return 0; fi
    if ((${have[i]:-0} < ${need[i]:-0})); then return 1; fi
  done
  return 0
}

require_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || fail "$APP_NAME can only be installed on macOS."
  [[ -f "$REPO_DIR/package.json" && -d "$REPO_DIR/src-tauri" ]] || fail "Run this script from the $APP_NAME repository."
}

require_command_line_tools() {
  if xcode-select -p >/dev/null 2>&1 && xcrun --find clang >/dev/null 2>&1; then
    success "Xcode Command Line Tools"
    return
  fi
  xcode-select --install >/dev/null 2>&1 || true
  fail "The Xcode Command Line Tools are required. Finish the installation dialog that just opened, then run ./scripts/install.sh again."
}

node_arch() {
  case "$(uname -m)" in
    arm64) echo "arm64" ;;
    x86_64) echo "x64" ;;
    *) fail "Unsupported CPU architecture: $(uname -m)" ;;
  esac
}

install_local_node() {
  local version arch name dir archive
  version="$(tr -d 'v[:space:]' <"$REPO_DIR/.nvmrc")"
  arch="$(node_arch)"
  name="node-v$version-darwin-$arch"
  dir="$TOOLING_DIR/$name"

  if [[ ! -x "$dir/bin/node" ]]; then
    info "Downloading Node.js $version into .tooling/"
    mkdir -p "$TOOLING_DIR"
    archive="$TOOLING_DIR/$name.tar.gz"
    curl -fsSL "https://nodejs.org/dist/v$version/$name.tar.gz" -o "$archive"
    curl -fsSL "https://nodejs.org/dist/v$version/SHASUMS256.txt" -o "$TOOLING_DIR/SHASUMS256.txt"
    (cd "$TOOLING_DIR" && grep " $name.tar.gz\$" SHASUMS256.txt | shasum -a 256 -c - >/dev/null) ||
      fail "Checksum verification of the Node.js download failed."
    tar -xzf "$archive" -C "$TOOLING_DIR"
    rm -f "$archive" "$TOOLING_DIR/SHASUMS256.txt"
  fi

  export PATH="$dir/bin:$PATH"
}

ensure_node() {
  local current=""
  if command -v node >/dev/null 2>&1; then
    current="$(node -p 'process.versions.node' 2>/dev/null || true)"
  fi

  if [[ -n "$current" ]] && version_ge "$current" "$MIN_NODE"; then
    success "Node.js $current"
    return
  fi

  [[ -n "$current" ]] && warn "Node.js $current is too old (need $MIN_NODE); using a local copy instead."
  install_local_node
  success "Node.js $(node -p 'process.versions.node') (local)"
}

install_local_rust() {
  export RUSTUP_HOME="$TOOLING_DIR/rustup"
  export CARGO_HOME="$TOOLING_DIR/cargo"

  if [[ ! -x "$CARGO_HOME/bin/cargo" ]]; then
    info "Installing the Rust toolchain into .tooling/ (one time)"
    mkdir -p "$TOOLING_DIR"
    curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs |
      sh -s -- -y --profile minimal --default-toolchain stable --no-modify-path >/dev/null
  fi

  export PATH="$CARGO_HOME/bin:$PATH"
}

ensure_rust() {
  local current=""
  if [[ -f "$HOME/.cargo/env" ]]; then
    source "$HOME/.cargo/env"
  fi
  if command -v rustc >/dev/null 2>&1 && command -v cargo >/dev/null 2>&1; then
    current="$(rustc --version 2>/dev/null | awk '{print $2}' | cut -d- -f1)"
  fi

  if [[ -n "$current" ]] && version_ge "$current" "$MIN_RUST"; then
    success "Rust $current"
    return
  fi

  [[ -n "$current" ]] && warn "Rust $current is too old (need $MIN_RUST); using a local toolchain instead."
  install_local_rust
  success "Rust $(rustc --version | awk '{print $2}') (local)"
}

install_dependencies() {
  cd "$REPO_DIR"
  if [[ -d node_modules && node_modules/.package-lock.json -nt package-lock.json ]]; then
    success "JavaScript dependencies up to date"
    return
  fi
  info "Installing JavaScript dependencies"
  npm ci --no-audit --no-fund --loglevel=error
  success "JavaScript dependencies"
}

build_app() {
  info "Building $APP_NAME (the first build compiles the Rust core and takes a few minutes)"
  cd "$REPO_DIR"
  npm run --silent build
  [[ -d "$BUILT_APP" ]] || fail "The build finished but $BUILT_APP was not found."
  success "Built $APP_NAME $(bundle_version "$BUILT_APP")"
}

bundle_version() {
  /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$1/Contents/Info.plist" 2>/dev/null || echo "unknown"
}

as_admin_if_needed() {
  if [[ -w "$(dirname "$APP_PATH")" && (! -e "$APP_PATH" || -w "$APP_PATH") ]]; then
    "$@"
  elif [[ -t 0 ]]; then
    sudo "$@"
  else
    local command
    command="$(printf '%q ' "$@")"
    command="${command//\\/\\\\}"
    command="${command//\"/\\\"}"
    osascript -e "do shell script \"$command\" with administrator privileges" >/dev/null
  fi
}

install_app() {
  local previous="" staging="$INSTALL_DIR/.$APP_NAME.app.installing"
  if [[ -d "$APP_PATH" ]]; then
    previous="$(bundle_version "$APP_PATH")"
  fi

  "$MAINTENANCE" quit
  info "Installing to $APP_PATH"
  [[ -w "$INSTALL_DIR" ]] || warn "$INSTALL_DIR is not writable by you; asking for an administrator password."

  as_admin_if_needed rm -rf "$staging"
  as_admin_if_needed ditto "$BUILT_APP" "$staging"
  as_admin_if_needed rm -rf "$APP_PATH"
  as_admin_if_needed mv "$staging" "$APP_PATH"
  as_admin_if_needed xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true

  local lsregister="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
  [[ -x "$lsregister" ]] && "$lsregister" -f "$APP_PATH" >/dev/null 2>&1 || true

  local current
  current="$(bundle_version "$APP_PATH")"
  if [[ -z "$previous" ]]; then
    success "Installed $APP_NAME $current"
  elif [[ "$previous" == "$current" ]]; then
    success "Reinstalled $APP_NAME $current"
  else
    success "Updated $APP_NAME $previous → $current"
  fi
}

ensure_data_dir() {
  mkdir -p "$DATA_DIR"
  success "Data folder $DATA_DIR"
}

print_next_steps() {
  echo
  printf '%s%s is ready.%s Open it from Applications, Launchpad or Spotlight.\n' "$BOLD" "$APP_NAME" "$RESET"
  if ! command -v claude >/dev/null 2>&1 && [[ ! -x "$HOME/.local/bin/claude" ]]; then
    echo "On first launch it will help you install and sign in to Claude Code, which it uses to read your books."
  fi
}

build_steps() {
  info "Checking requirements"
  require_command_line_tools
  ensure_node
  ensure_rust
  install_dependencies
  build_app
}

install_steps() {
  [[ -d "$BUILT_APP" ]] || fail "No built app found at $BUILT_APP. Run ./scripts/install.sh first."
  install_app
  ensure_data_dir
}

main() {
  parse_args "$@"
  require_macos

  if [[ "$STEPS" != "install" ]]; then
    build_steps
  fi
  if [[ "$STEPS" == "build" ]]; then
    return
  fi

  install_steps
  print_next_steps

  if [[ "$OPEN_AFTER_INSTALL" == true ]]; then
    open "$APP_PATH"
  fi
}

main "$@"
