# Development

## Setup

Requirements: macOS, Xcode Command Line Tools, Node.js ≥ 22.12 (see `.nvmrc`), Rust ≥ 1.85. Claude Code is
needed to parse books.

```sh
npm ci
npm run dev        # Vite dev server + the app with hot reload
```

Use a separate data folder while developing so your real library stays untouched:

```sh
ALEXANDRIA_HOME=/tmp/alexandria-dev npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the app in development mode |
| `npm run build` | Build `src-tauri/target/release/bundle/macos/Alexandria.app` |
| `npm run app:install` | Build and install into `/Applications` (`scripts/install.sh`) |
| `npm run app:update` | Pull, build and reinstall (`scripts/install.sh --update`) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | Biome, stylelint (styled-components) and clippy |
| `npm run lint:fix` | Fix Biome and stylelint issues |
| `npm run format:rust` | rustfmt |
| `npm test` | Vitest and the Rust test suite |
| `npm run check` | typecheck + lint + test |
| `npm run icons` | Regenerate all icon sizes from `src/resources/icon.svg` |

## Tests

All tests live in `tests/`:

- `tests/frontend/` — Vitest (`npm run test:web`), mirroring `src/` (for example
  `tests/frontend/utils/display-format.test.ts` tests `src/utils/display-format.ts`)
- `tests/backend/` — Rust integration tests (`npm run test:rust`), mirroring the crate's module folders (for
  example `tests/backend/study/attempts.rs` tests `study::attempts`). They use the crate's public modules
  (`library`, `storage`, `study`); database tests use `storage::db::open_in_memory()`.

Each backend test file is a `[[test]]` target in `src-tauri/Cargo.toml` named `<folder>_<file>`. Add one when
you add a file.

## Code style

- **Files:** kebab-case. `.tsx` files may be PascalCase (components); React hooks live in PascalCase `.tsx`
  files (`hooks/UseResource.tsx` exports `useResource`). Directories are descriptive kebab-case.
  Rust module files and folders are single words, because Rust module names cannot contain hyphens.
- **Styles:** styled-components in `Component.styles.ts`; global styles in `app/theme/GlobalStyles.ts`.
- **Functions:** arrow functions only (`const f = () => {}`), including components.
- **Exports:** never inline. Declare plainly and export at the bottom of the file
  (`export { a, b };` then `export type { T };`).
- **Comments:** none in code, except doc comments on functions (JSDoc in TypeScript, `///` in Rust).
  Explanations that don't fit a function doc belong in these docs.
- **Readability:** separate logical blocks inside functions with blank lines.
- **Imports:** `@/` alias for everything under `src/`; Biome sorts them (types first, styles last).
- **Rust:** `cargo fmt` (120 columns) and clippy with warnings as errors.

## Adding a command

1. Implement the logic in the relevant Rust module.
2. Add a thin `#[tauri::command]` to the matching file in `src-tauri/src/commands/` and register it in `lib.rs`.
3. Add the typed wrapper to `src/services/tauri-bridge/commands.ts` and any types to `src/services/tauri-bridge/types.ts`.
   Rust structs use `#[serde(rename_all = "camelCase")]`, and TypeScript types mirror them.
4. If the command changes a book, call `notify(&app, &book_id)` so open screens refresh.

## Changing the database

Append a migration to `MIGRATIONS` in `src-tauri/src/storage/db.rs`. Existing installs apply it on the next launch.

## Changing prompts

Prompts and schemas are in `src-tauri/src/claude/prompts.rs`. Keep the schema and the `SectionOutput` / `BookOutput`
structs in `parsing/pipeline.rs` in sync. Generated questions always pass through `study::questions::normalize`.
