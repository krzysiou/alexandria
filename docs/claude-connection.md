# Claude connection

Alexandria talks to Claude through **Claude Code**, the `claude` command-line tool, using the account it is
signed in with. Alexandria never sees or stores credentials.

## Finding `claude`

Apps opened from Finder or the Dock don't inherit your shell's `PATH`, so `claude/cli.rs` builds one:

1. the `PATH` printed by your login shell (`$SHELL -l -i -c env`, falling back to a non-interactive login
   shell; the shell comes from Directory Services when `$SHELL` is unset)
2. common install locations: `~/.local/bin`, `~/.claude/local`, `~/.npm-global/bin`, `~/.bun/bin`,
   `~/.volta/bin`, asdf/mise shims, `/opt/homebrew/bin`, `/usr/local/bin`, and nvm/fnm Node versions
3. the system directories

The first executable `claude` found wins. **Settings → Claude → Claude Code location** overrides the search.

## Startup check

On every launch the app runs `claude --version` and `claude auth status --json`:

- installed and `loggedIn: true` → the app opens directly
- otherwise → the setup screen, which re-checks every 4 seconds

The setup screen can:

- **Install Claude Code** — opens Terminal with the official installer (`curl -fsSL https://claude.ai/install.sh | bash`)
- **Sign in** — opens Terminal with `claude auth login`
- accept a custom path to an existing `claude` binary

## How Claude is called

Every parse step runs:

```sh
claude -p --output-format stream-json --verbose --no-session-persistence \
  --model <model> --system-prompt <system> --json-schema <schema> \
  --tools ""            # or: --tools Read --allowedTools Read for scanned PDFs
```

with the prompt on stdin and the book's folder as working directory. From the stream of JSON messages the app
reads the final `result` (`structured_output` validated against the schema, `is_error`, `total_cost_usd`) and
the latest `rate_limit_event`, which carries the 5-hour and weekly plan usage (see
[Book parsing](book-parsing.md#cost-and-plan-limits)). Sessions are not
persisted, so parsing doesn't clutter your Claude Code history.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Setup says Claude Code was not found | Install it from the setup screen, or set its location in Settings |
| "Could not read the login status" | Update Claude Code (`claude update`); `auth status` needs a recent version |
| Sections fail with usage-limit errors | Wait for your plan's limit to reset and press **Resume**, or lower *Parallel sections* |
| Sections time out | Choose a faster model or fewer questions per section, then **Resume** |
