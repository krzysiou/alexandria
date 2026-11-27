use serde_json::{json, Value};

pub const SYSTEM: &str = r#"You are Alexandria's study author. You turn one book into study material for a learner who will read your notes and take tests on another day, WITHOUT the book in front of them.

Principles:
1. Fidelity. Use only what the provided book content says. Never invent facts, numbers, names, code or quotes. When the book is unclear, write less rather than guess.
2. Language. Write everything (headings, notes, questions, answers, explanations, titles) in the language of the book. Keep technical identifiers such as code, keywords and API names exactly as the book writes them.
3. Self-contained. Everything you write must make sense on its own, without access to the book, its figures, listings, page layout or other sections.
4. Teach, don't index. Prioritise the ideas a learner must understand and be able to apply. Skip publishing details, page logistics and anecdotes unless they carry an idea.
5. Headings. Every heading you write is in the book's language, even when these instructions name it in English.
6. Formatting. GitHub-flavoured Markdown: ## and ### headings (never a top-level #), short paragraphs, bullet lists, **bold** key terms, tables for comparisons, > blockquotes for verbatim quotes, fenced code blocks with a language tag for code. Cite pages as (p. 42) for important facts and quotes.
7. Output. Respond only through the required structured output."#;

const QUESTION_RULES: &str = r#"The learner answers WITHOUT the book and remembers concepts, not the book's storyline. Every question must be answerable by someone who understands the topic but has never read this book, from the question text alone:
- Include everything the question depends on. If it is about code, an example, a scenario, a table, a definition or a quote, put that material in the question itself; code goes in a fenced block with a language tag, trimmed to what matters (at most about 15 lines).
- Never refer to anything the learner cannot see or would have to remember from the book's narrative: no named functions, types, variables or classes from the book unless their code is shown in the question ("the `decrypt` function"), no listings or figures ("listing 3.2", "the example above"), no steps of the book's storyline ("the first approach", "the author's third attempt", "after adding overloads"), no "as the author shows", "in this chapter", "the passage", "the text".
- Ask about understanding and application: why something works, what happens if…, which approach fits a situation, what an error means, how two concepts differ, what a short snippet does or why it does (not) compile.
- Avoid trivia: page or chapter numbers, the order of chapters, publication details, the author's biography or opinions as such, exact wording of sentences.
- Do not give the answer away in the question, and avoid questions that common sense alone can answer.

Example of the difference:
- Bad: "Why is the type cast in the `decrypt` function acceptable?" (the learner cannot see `decrypt`)
- Bad: "What problem remained after the second approach?" (depends on the book's storyline)
- Good: "This function parses a message from a trusted service:
```ts
function decrypt(data: string): Message {
  return JSON.parse(data) as Message;
}
```
Why is the `as Message` cast an acceptable compromise here, and what must be true for it to be safe?"

Question kinds:
- About half `multiple_choice`: exactly 4 options with exactly one correct. Distractors are plausible, mutually exclusive and similar in length and style; never "all of the above" or "none of the above". `answer` is the exact text of the correct option. Options may contain inline `code`.
- About a quarter `true_false`: one unambiguous, self-contained statement about the subject (not about the book or its author), no double negatives or trick wording; balance true and false. `answer` is "true" or "false"; `options` is [].
- The rest `short_answer`: answerable in 1–3 sentences. `answer` is a complete model answer that names the key points a correct answer must contain, so the learner can grade themselves; `options` is [].
- Mix difficulties: easy (recall a key fact or definition), medium (explain or compare), hard (apply to a new example or predict an outcome).
- `explanation`: 1–3 sentences on why the answer is correct (for multiple choice also why the most tempting wrong option is wrong), ending with the page reference.

Before answering, check every question: could someone who understands the topic but never read this book answer it from the question text alone? If not, add the missing code or context to the question, or replace the question."#;

fn question_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "kind": { "type": "string", "enum": ["multiple_choice", "true_false", "short_answer"] },
            "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] },
            "question": { "type": "string" },
            "options": { "type": "array", "items": { "type": "string" } },
            "answer": { "type": "string" },
            "explanation": { "type": "string" }
        },
        "required": ["kind", "difficulty", "question", "options", "answer", "explanation"]
    })
}

pub fn section_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "title": { "type": "string" },
            "summary": { "type": "string" },
            "key_data": { "type": "string" },
            "notes": { "type": "string" },
            "questions": { "type": "array", "items": question_schema() }
        },
        "required": ["title", "summary", "key_data", "notes", "questions"]
    })
}

pub fn book_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "title": { "type": "string" },
            "author": { "type": "string" },
            "summary": { "type": "string" },
            "overview_title": { "type": "string" },
            "overview": { "type": "string" },
            "glossary_title": { "type": "string" },
            "glossary": { "type": "string" },
            "takeaways_title": { "type": "string" },
            "takeaways": { "type": "string" },
            "questions": { "type": "array", "items": question_schema() }
        },
        "required": [
            "title", "author", "summary", "overview_title", "overview", "glossary_title", "glossary",
            "takeaways_title", "takeaways", "questions"
        ]
    })
}

/// Instructions for the `questions` field, asking for up to `count` questions.
fn question_rules(count: u32) -> String {
    format!(
        "Write {count} test questions when the material supports it. Write fewer, even none, when the content is \
thin, for example a title page, table of contents, copyright page, errata, acknowledgements or index.\n\n{QUESTION_RULES}"
    )
}

pub struct SectionInput<'a> {
    pub book_title: &'a str,
    pub author: Option<&'a str>,
    pub index: usize,
    pub total: usize,
    pub title: &'a str,
    pub placeholder: bool,
    pub start_page: usize,
    pub end_page: usize,
    pub questions: u32,
    pub content: Option<String>,
}

/// Share of a section's length its notes should aim for.
const NOTES_SHARE: f64 = 0.3;

/// Fewest words the notes of a full section aim for, however short it is.
const NOTES_MIN_WORDS: usize = 250;

/// Length target for a section's notes: about a third of the section, in
/// words when its text is known (scanned sections are read from the PDF).
fn notes_length_rule(content: Option<&str>) -> String {
    match content {
        Some(text) => {
            let words = text.split_whitespace().count();
            let target = ((words as f64 * NOTES_SHARE / 50.0).round() as usize * 50).max(NOTES_MIN_WORDS);
            format!("For a full section, aim for about {target} words, roughly a third of its {words} words.")
        }
        None => "For a full section, aim for roughly a third of its length.".to_string(),
    }
}

/// Prompt for one section: title, summary, key data, notes and questions.
pub fn section_prompt(input: &SectionInput) -> String {
    let by = input.author.map(|a| format!(" by {a}")).unwrap_or_default();

    let title_rule = if input.placeholder {
        "the working title above is only a placeholder: give this section a concise, descriptive title (use the \
book's own chapter title when one appears in the pages)."
    } else {
        "keep the book's own chapter title (you may fix capitalisation or remove page numbers)."
    };

    let source = match &input.content {
        Some(text) => format!("<book_section>\n{text}\n</book_section>"),
        None => format!(
            "The text of these pages could not be extracted (scanned PDF). Use the Read tool on the file `book.pdf` \
in the current directory to read pages {}–{} (at most 20 pages per Read call), then produce the output.",
            input.start_page, input.end_page
        ),
    };

    format!(
        r#"Book: "{book}"{by}
Section {index} of {total}: "{title}" (pages {start}–{end})

Produce study material for this section.

1. `title`: {title_rule}

2. `summary`: 2–3 sentences on what this section teaches and why it matters.

3. `key_data`: a dense, skimmable reference of the most important content, with no prose filler. This is the deliberately terse companion to the notes. Group it under ## headings in the book's language, using only the groups that apply: the core concepts; definitions of terms; key facts and figures; rules and guidelines; processes and methods; code patterns (short examples in fenced blocks); people, places and dates; notable quotes (verbatim, as blockquotes with the page). Prefer bullets and tables, and **bold** each key term.

4. `notes`: study notes that compress this section into its most valuable content. {length_rule} They replace reading the section, so they keep everything a learner needs: every important idea with the context that makes it understandable (the problem it solves, how it works, why it works that way) and the caveats that matter. Never drop an important idea to save space; shorten the wording instead.
   Compress by cutting what does not teach: repetition and recaps, digressions, anecdotes, long build-ups and transitions, the book's storyline ("first we'll try…", "in the next chapter…"), and examples that repeat a point already made. Per idea, keep the one example or code snippet that makes it clearest, trimmed to the lines that matter (usually under 15).
   Write dense, clear prose: short paragraphs that state the reasoning directly, each term defined the first time it appears. Use bullets only for genuine lists, tables for comparisons, and code blocks for code; never reduce an explanation to bullet fragments.
   Structure the notes with these ## headings, in this order, skipping any with nothing to say. Each item says what the heading covers; the heading text itself must be in the book's language and only in English when the book is in English:
   1. an overview: what the section is about and why it matters, in 2–4 sentences;
   2. the main ideas, with one ### subheading per idea in the order the book develops them, each covering the motivation, the idea, how it works and its consequences, with its example or code when that makes it clearer;
   3. common pitfalls: mistakes and misconceptions the book warns about, why they happen and how to avoid them.
   For example, a Polish book uses: ## Przegląd, ## Główne idee, ## Typowe pułapki. A German book uses: ## Überblick, ## Hauptideen, ## Typische Fallstricke.
   For front or back matter (title page, table of contents, copyright, errata, acknowledgements, index), keep `key_data` and `notes` to a few lines describing what the section contains.

5. `questions`: {rules}

{source}"#,
        book = input.book_title,
        index = input.index,
        total = input.total,
        title = input.title,
        start = input.start_page,
        end = input.end_page,
        rules = question_rules(input.questions),
        length_rule = notes_length_rule(input.content.as_deref()),
    )
}

pub struct BookSection {
    pub title: String,
    pub start_page: i64,
    pub end_page: i64,
    pub summary: String,
    pub key_data: String,
}

/// Prompt for the whole-book pass, built from every section's key data.
pub fn book_prompt(book_title: &str, author: Option<&str>, sections: &[BookSection], questions: u32) -> String {
    let mut digest = String::new();
    for (i, s) in sections.iter().enumerate() {
        digest.push_str(&format!(
            "<section index=\"{}\" title=\"{}\" pages=\"{}–{}\">\nSummary: {}\n\n{}\n</section>\n\n",
            i + 1,
            s.title.replace('"', "'"),
            s.start_page,
            s.end_page,
            s.summary,
            s.key_data
        ));
    }

    let author_line = author.map(|a| format!("Author (from PDF metadata): {a}\n")).unwrap_or_default();

    format!(
        r#"Working title (from the file name or PDF metadata, may be wrong): "{book_title}"
{author_line}
Below is the key data of every section of the book, in order. Produce whole-book study material:

1. `title`: the book's real title. `author`: the author(s), or "" if unknown.

2. `summary`: one paragraph (3–5 sentences) describing the book and who it is for.

3. `overview_title`, `glossary_title`, `takeaways_title`: the words "Overview", "Glossary" and "Key takeaways" in the book's language.

4. `overview`: ## headings in the book's language covering, in order: what the book is about; its central thesis; its structure (a table with one row per section: section, pages, the section in one line); the big ideas (one ### per idea with a short explanation); how to study the book (suggested order, which sections matter most).

5. `glossary`: the important terms, alphabetical, as a table whose columns (term, meaning, where: section and page) have headers in the book's language. Each meaning must be understandable on its own.

6. `takeaways`: ## headings in the book's language covering, in order: the key takeaways (a numbered list, each with one sentence of explanation); how to put them into practice; common misconceptions the book corrects (skip if none).

7. `questions`: {rules}
Focus these on ideas that span several sections and on the book's overall argument. You only see key data here, so base every question strictly on it.

{digest}"#,
        rules = question_rules(questions),
    )
}
