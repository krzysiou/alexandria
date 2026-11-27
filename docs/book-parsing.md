# Book parsing

Parsing is the **only** part of Alexandria that uses Claude. It runs once per book and produces everything
the app needs afterwards: key data, notes and the question bank.

## 1. Extraction (local, no AI)

`src/services/pdf-import/extract-pdf.ts` loads the PDF with pdf.js and produces:

- the text of every page (line breaks kept)
- the outline (table of contents) resolved to page numbers, using the second level when the top level is too
  coarse, for example a book split into two "Parts"
- title and author from the PDF metadata
- a JPEG of the first page, used as the cover

The Rust core normalises whitespace and stores the result in `source/pages.json` and `source/outline.json`.

## 2. Sectioning

`src-tauri/src/library/sections.rs` splits the book into sections that are each sent to Claude in one call:

| Rule | Value |
| --- | --- |
| Use the outline when it has at least 2 entries inside the book | chapters become sections |
| Text before the first chapter | becomes "front matter" and is merged forward when small |
| Sections under 1,500 words | merged with the next one |
| Sections over 12,000 words | split on page boundaries into parts of about 7,000 words |
| No usable outline | chunks of about 7,000 words, named later by Claude |
| Fewer than 25 words per page on average (scanned PDF) | chunks of 15 pages, read by Claude from the PDF itself |

Sections whose title is generic (page ranges, merged chapters) are flagged as placeholders, and Claude gives
them a descriptive title.

## 3. Section pass (parallel)

Each section is one `claude -p` call (`parsing/pipeline.rs`, `claude/prompts.rs`). The prompt contains the section text with
`[Page N]` markers, so Claude can cite pages. Structured output is enforced with `--json-schema`:

| Field | Becomes |
| --- | --- |
| `title`, `summary` | section title and summary (database) |
| `key_data` | `key-data/NNN-<slug>.md` — concepts, definitions, facts, frameworks, quotes |
| `notes` | `notes/NNN-<slug>.md` — overview, main ideas, common pitfalls |
| `questions` | question bank rows (see [Tests & grading](tests-and-grading.md)) |

Sections run `settings.concurrency` at a time (default 2). Each call is retried once after 10 seconds, and
times out after 20 minutes. For scanned sections Claude gets the `Read` tool and reads the PDF pages directly.

## 4. Whole-book pass

When every section is done, one more call receives each section's summary and key data and returns:

- the real title, author and a one-paragraph summary
- `notes/000-overview.md` — thesis, structure table, big ideas
- `notes/900-glossary.md` — term table with where each term appears
- `notes/901-key-takeaways.md` — takeaways, practice, misconceptions
- cross-chapter questions (`settings.bookQuestions`, default 10)

Finally `tests/question-bank.md` is written and the book becomes **Ready**.

## Status, pausing and resuming

| Book status | Meaning |
| --- | --- |
| `importing` | PDF copied, text being extracted in the UI |
| `queued` | waiting to start |
| `processing` | stage `sections`, then stage `book` |
| `paused` | paused by the user, or the app quit while parsing |
| `failed` | a section or the whole-book pass failed; the error is shown on the book |
| `ready` | done |

Progress is saved per section, so nothing is paid for twice:

- **Pause** stops the running Claude calls; the sections they were working on go back to pending.
  **Resume** re-runs only sections that are not `done`, then the whole-book pass.
- **Quitting the app** while a book is parsing stops the running Claude calls too (each runs in its own
  process group and the app terminates them on exit), so they don't keep using your plan in the background.
- **Reopening the app** continues every book that was interrupted by quitting (or a crash) automatically.
  Books you paused yourself stay paused until you press Resume.
- Imports that never finished extracting text are removed on startup; add the PDF again.

Only the sections that were in flight when you paused or quit are redone; their partial work is lost.

## Prompting rules

The prompts live in `src-tauri/src/claude/prompts.rs`. They are written for a learner who studies later
**without the book**:

- **Fidelity:** only what the book says. No invented facts, numbers, code or quotes.
- **Language:** everything, headings included, in the book's language. The prompt describes headings by
  purpose and gives translated examples, so Claude doesn't copy English labels.
- **Notes are a compression:** they replace reading the section, so they carry every important idea with its
  context (motivation, how it works, why, caveats) in dense explanatory prose, keeping one example or trimmed
  code snippet per idea. They aim for about a third of the section's words (at least 250); repetition,
  digressions, anecdotes and the book's storyline are cut, and ideas are never dropped to hit the length.
- **Key data is terse:** the skimmable fact sheet: concepts, definitions, facts, rules, code patterns, quotes.
- **Questions are self-contained:** answerable by someone who understands the topic but never read the book,
  from the question alone. Anything a question depends on (code, an example, a scenario) is included in it,
  usually as a short fenced code block. Questions never refer to the book's named functions, listings, figures
  or storyline ("the first approach"), and test understanding and application rather than trivia. Claude
  self-checks every question against this rule before answering.
- **Front and back matter** (title page, contents, errata, index) get short notes and no questions.
- At most the configured number of questions is stored per section.

## Cost and plan limits

Every Claude call reports its cost (`total_cost_usd`) and, for subscription accounts, the current usage of the
plan's **5-hour** and **weekly** limits (a `rate_limit_event` in the stream output). Alexandria uses both:

- **Cost:** the total per book is shown on the Overview tab as "one-time AI usage ≈ $2.20". For subscription
  accounts it is what the usage would cost at API prices, not a charge.
- **Share of the 5-hour limit:** when parsing starts, the latest known reading is the starting point; after
  every call, the increase of the 5-hour usage since the book's previous reading is added to the book
  (`storage/usage.rs`). If the window resets mid-parse, usage in the new window counts from zero. The result
  is shown next to the cost ("≈ 18% of a 5-hour limit").
- **Live usage:** while a book parses, its header shows how much of the 5-hour limit is used and when it
  resets. Settings → Claude → *Plan usage* shows the 5-hour and weekly limits from the last call.

The per-book share is an estimate: the limits are shared with everything else you do with Claude, so usage
elsewhere while a book parses is counted too, and Claude reports usage in whole percent. Books parsed before
this feature existed only show their cost. Accounts without plan limits (Anthropic Console API keys) show the
cost only.

## Spending cap

Every book has a spending cap (Settings → Parsing → *Spending cap per book*, default **$5**), enforced in
`parsing/budget.rs`:

- Before each Claude call, the money already spent on the book, plus the expected cost of the calls still
  running, plus this call (twice the average for the whole-book pass) must fit under the cap. The expected cost
  is the average of the book's calls so far ($0.15 before the first one).
- Each call also gets a hard ceiling through `claude --max-budget-usd`, so no single call can spend past what
  is left.
- When the next call would not fit, parsing **pauses**: finished sections are kept, the rest stay pending, and
  the book shows how much of the cap was used. Raise the cap and press Resume to continue.

The cap counts the book's total cost across pauses and resumes.

## Settings that affect parsing

| Setting | Default | Range |
| --- | --- | --- |
| Model | `sonnet` | `haiku`, `sonnet`, `opus` |
| Parallel sections | 2 | 1–6 |
| Questions per section | 8 | 3–20 |
| Cross-chapter questions | 10 | 0–30 |
| Spending cap per book | $5 | $1–$50 |

They apply to books added or resumed after a change.
