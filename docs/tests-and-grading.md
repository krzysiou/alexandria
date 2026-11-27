# Tests & grading

Tests are built from the question bank generated during parsing. Taking and grading tests never calls Claude.

## Question types

| Kind | Stored answer | Graded by |
| --- | --- | --- |
| `multiple_choice` | index of the correct option (options are shuffled when stored) | the app, automatically |
| `true_false` | `"true"` or `"false"` | the app, automatically |
| `short_answer` | a 1–3 sentence model answer | **you** — compare with the model answer and mark *Missed it* (0), *Partly* (0.5) or *Got it* (1) |

Every question has a difficulty (easy / medium / hard) and an explanation citing the page.

`study/questions.rs` validates what Claude returns before storing it and drops questions it cannot grade reliably:
multiple choice with fewer than 2 or more than 6 options, an answer that matches no option (letters such as
`B` or `B)` are understood), or true/false answers other than true or false.

## Starting a test

On a book's **Tests** tab:

- **Cover** — the whole book, or chosen sections (optionally with the cross-chapter questions)
- **Questions** — 10, 20, 30 or 50
- **Types** — any combination of the three kinds
- Questions are always picked with a focus on what you haven't mastered: questions you have never answered
  come first, then those with the lowest average score; ties are random

The selected questions are presented in random order.

## Taking a test

- One question at a time, with a progress bar and dots to jump between questions.
- Keyboard: `1`–`4` or `A`–`D` choose an option, `T` / `F` answer true/false, `←` `→` move, `Enter` goes next.
- Answers are saved as you go. **Leave** keeps the test in progress; open it again from the history to continue.
- Finishing with unanswered questions asks for a second click; unanswered questions score 0.

## Results

After submitting, multiple choice and true/false are graded immediately. Open answers show your answer next
to the model answer for self-grading. While any open answer is ungraded the test is in **review**; once all
are graded it becomes **graded** and gets its final score:

```text
score = sum of question scores / number of questions
```

The results screen can filter **All**, **Mistakes** and **To review**. Grades of open answers can be changed
later. Each graded or reviewed test is exported to `results/<date>-<id>.md` in the book's folder.

## Statistics

The Tests tab shows tests taken, best and average score (graded tests only), and **mastery** per section: the
average score of every answer ever given to that section's questions. The same scores decide which questions
new tests pick first.
