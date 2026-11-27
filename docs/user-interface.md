# User interface

## Screens

| Screen | Folder | Purpose |
| --- | --- | --- |
| Claude setup | `src/screens/claude-setup` | Shown only when Claude Code is missing or signed out |
| Library | `src/screens/library` | Book grid, add books (button or drag and drop anywhere), import progress |
| Book | `src/screens/book-detail` | Header with parse status and actions (pause/resume, save the original PDF, show in Finder, delete); tabs **Overview**, **Notes**, **Key data**, **Tests** |
| Test | `src/screens/test-session` | Test runner, then results with self-grading |
| Settings | `src/screens/settings` | Theme, Claude, parsing options, storage, maintenance |

The **Notes** and **Key data** tabs use the document reader (`src/components/markdown-reader`): a document list grouped
into *Whole book* and *Sections*, the rendered document, and an "On this page" outline built from its `##` and
`###` headings.

### Reading mode

**Reading mode** (button at the right end of the book's tab bar on the Notes and Key data tabs, or press `F`)
shows one document at a time over the whole window:
the sidebar, document list and outline are hidden. A thin bar under the top bar shows how far you have read
the current note. At the bottom, *Previous* and *Next* show the neighbouring titles, and the middle shows
the position ("3 of 24") with a progress bar. Pagination follows the list order: whole-book documents first,
then the sections. Keys: `←` / `→` to change document, `Esc` to leave.

### Library search

The search field in the Library header (`⌘F` to focus, `Esc` to clear) works on two levels:

- **Books** are filtered instantly by title, author and summary.
- **In notes & key data** searches the text of every book's markdown documents (`library/search.rs`). Every
  word must appear; results are ordered by the number of matches and show a highlighted snippet. Clicking a
  result opens the book on that document.

### Sidebar

The sidebar footer holds **Settings**, the **theme** switch and **Hide sidebar**. When the sidebar
is hidden, a *Show sidebar* button takes the same bottom-left corner of the window (`⌘\` and `⌃⌘S` toggle it
too). The choice is stored in the settings (`sidebarHidden`).

Keyboard shortcuts are never displayed in the app (no hints, badges or shortcut tooltips); they are listed in
these docs only.

Navigation is a small in-memory router (`src/app/state/Navigation.tsx`): the app has no URLs. A book route
can carry a document (`doc`) so other screens, such as search, can open a specific note.

## Markdown rendering

`Markdown.tsx` renders GitHub-flavored markdown with `react-markdown`, `remark-gfm` (tables, task lists,
strikethrough) and `rehype-slug` (heading ids for the outline). Reading typography (`Markdown.styles.ts`):

- serif body text (New York) at 17px with a comfortable line length (74 characters)
- sans-serif section headings, accent-coloured `###` headings
- gold-accented blockquotes for quotes; the section summary under the title is highlighted in blue
- zebra-striped, scrollable tables with uppercase headers
- external links open in the default browser

## Appearance

Settings → Appearance has three choices, all stored in the settings table:

- **Mode:** System (follows macOS), Light or Dark. The sidebar button cycles through them too.
- **Font:** one font for the whole app. *Default* pairs SF Pro for the interface with New York for reading.
  The other choices (SF Pro, New York, Inter, Avenir Next, Helvetica Neue, Atkinson Hyperlegible, Charter,
  Georgia, Iowan Old Style, Literata, Merriweather, Source Serif) apply one family everywhere. Inter, Literata,
  Merriweather, Source Serif and Atkinson Hyperlegible are bundled (Fontsource), so they work offline; the
  rest ship with macOS.
- **Color theme:** Alexandria (charcoal, cream and gold, matching the icon), Sepia, Forest, Ocean, Rosé or Graphite. Every theme has a light
  and a dark version; the swatches preview both.

How it works:

- `src/app/theme/palettes.ts` defines each theme's colors for both modes; `src/app/theme/fonts.ts` defines the
  font choices.
- `GlobalStyles` writes the chosen palette and font as CSS custom properties (light values on `:root`, dark
  values on `[data-theme="dark"]`).
- `src/app/theme/theme.ts` exposes the variables as typed values (`color.surface` is `var(--surface)`), so
  styled components never hard-code colors and switching theme, mode or font needs no re-render of components.
- `useTheme` sets `data-theme` on `<html>` and the native window appearance.

## Styling conventions

- styled-components only, in a `Component.styles.ts` file next to `Component.tsx`
- transient props (`$variant`, `$active`) for styling variants, so they never reach the DOM
- shared primitives in `src/components/ui-kit`: `Button`, `IconButton`, form controls, `Segmented`, `Chip`, layout
  (`Page`, `Card`, `Stack`, `StatGrid`), `Text` with tones, feedback components (spinner, progress bar,
  badges, banners, empty state, score ring), `BookCover`, `ConfirmButton`
- active and pressed states use ARIA attributes (`aria-pressed`, `aria-selected`) rather than class names
- destructive actions use `ConfirmButton` (click twice; disarms after 4 seconds)

## Window

The title bar is transparent (`titleBarStyle: Overlay`) with the traffic lights inset over the sidebar.
Headers and the top strip of the content area are window drag regions.

## Icon

`src/resources/icon.svg` is the single source: a cream geometric "A" (an open book lying face down) with a
muted gold dot of light inside it, on a warm charcoal squircle. Regenerate the macOS sizes with
`npm run icons` (delete the Android, iOS and Windows files it also writes; only the files listed in
`tauri.conf.json` are used).
