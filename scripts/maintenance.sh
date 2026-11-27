#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Alexandria"
BUNDLE_ID="app.alexandria.desktop"
APP_PATH="/Applications/$APP_NAME.app"
DATA_DIR="$HOME/.alexandria"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR=""
ASSUME_YES=false
ACTION=""

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
Usage: maintenance.sh <action> [--repo DIR] [--yes]

Actions:
  update      Pull the latest source (git checkouts with an upstream), build,
              then print "::ready-to-install", wait for $APP_NAME to quit,
              install the new version and reopen it. $DATA_DIR is kept.
  reset       Quit $APP_NAME and delete $DATA_DIR (books, notes, tests,
              settings). The app stays installed and is reopened.
  uninstall   Quit $APP_NAME, delete $DATA_DIR and its caches, and remove
              $APP_PATH.
  quit        Quit $APP_NAME if it is running.

Options:
  --repo DIR  Source repository used by "update" (default: this script's repo)
  --yes       Do not ask for confirmation
EOF
}

parse_args() {
  [[ $# -gt 0 ]] || {
    usage
    exit 1
  }
  ACTION="$1"
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        REPO_DIR="${2:-}"
        shift 2
        ;;
      --yes) ASSUME_YES=true && shift ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) fail "Unknown option: $1" ;;
    esac
  done
}

confirm() {
  [[ "$ASSUME_YES" == true ]] && return 0
  local answer
  read -r -p "$1 Type 'yes' to continue: " answer
  [[ "$answer" == "yes" ]] || fail "Cancelled."
}

app_pids() {
  pgrep -a -f "$APP_PATH/Contents/MacOS/" 2>/dev/null || true
}

quit_app() {
  local grace="${1:-30}"
  [[ -n "$(app_pids)" ]] || return 0
  info "Waiting for $APP_NAME to quit"

  local waited=0
  while [[ -n "$(app_pids)" ]] && ((waited < grace)); do
    sleep 0.5
    waited=$((waited + 1))
  done

  if [[ -n "$(app_pids)" ]]; then
    pkill -a -TERM -f "$APP_PATH/Contents/MacOS/" || true
    sleep 2
  fi
  if [[ -n "$(app_pids)" ]]; then
    pkill -a -KILL -f "$APP_PATH/Contents/MacOS/" || true
    sleep 1
  fi

  success "$APP_NAME is not running"
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

delete_data() {
  rm -rf "$DATA_DIR"
  success "Deleted $DATA_DIR"
}

delete_system_caches() {
  rm -rf \
    "$HOME/Library/Caches/$BUNDLE_ID" \
    "$HOME/Library/WebKit/$BUNDLE_ID" \
    "$HOME/Library/Saved Application State/$BUNDLE_ID.savedState" \
    "$HOME/Library/Preferences/$BUNDLE_ID.plist"
  success "Deleted macOS caches of $APP_NAME"
}

resolve_repo() {
  if [[ -z "$REPO_DIR" ]]; then
    REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  fi
  [[ -x "$REPO_DIR/scripts/install.sh" ]] ||
    fail "The $APP_NAME source code was not found at $REPO_DIR. Clone the repository again and run ./scripts/install.sh from it."
}

pull_latest() {
  if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    warn "$REPO_DIR is not a git checkout; rebuilding the current source."
    return
  fi
  if ! git -C "$REPO_DIR" rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
    warn "The current branch has no upstream; rebuilding the current source."
    return
  fi

  info "Pulling the latest changes"
  if git -C "$REPO_DIR" pull --ff-only; then
    success "Source is up to date"
  else
    warn "Could not fast-forward (local changes?); rebuilding the current source."
  fi
}

run_update() {
  resolve_repo
  pull_latest
  "$REPO_DIR/scripts/install.sh" --build-only

  echo "::ready-to-install"
  quit_app
  "$REPO_DIR/scripts/install.sh" --install-only --open
}

run_reset() {
  confirm "This deletes all books, notes, tests and settings in $DATA_DIR."
  quit_app
  delete_data
  if [[ -d "$APP_PATH" ]]; then
    open "$APP_PATH"
    success "Reopened $APP_NAME with a fresh library"
  fi
}

run_uninstall() {
  confirm "This deletes $DATA_DIR and removes $APP_PATH."
  quit_app
  delete_data
  delete_system_caches
  if [[ -d "$APP_PATH" ]]; then
    as_admin_if_needed rm -rf "$APP_PATH"
    success "Removed $APP_PATH"
  fi
  echo
  echo "$APP_NAME has been uninstalled. Run ./scripts/install.sh from the repository to install it again."
}

main() {
  parse_args "$@"
  case "$ACTION" in
    update) run_update ;;
    reset) run_reset ;;
    uninstall) run_uninstall ;;
    quit) quit_app 0 ;;
    -h | --help) usage ;;
    *) fail "Unknown action: $ACTION (see --help)" ;;
  esac
}

main "$@"
