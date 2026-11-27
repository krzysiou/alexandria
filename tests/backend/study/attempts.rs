use alexandria_lib::study::{
    attempts::*,
    questions::{replace_questions, GeneratedQuestion},
};

fn q(kind: &str, options: &[&str], answer: &str) -> GeneratedQuestion {
    GeneratedQuestion {
        kind: kind.into(),
        difficulty: "HARD".into(),
        question: " Why? ".into(),
        options: options.iter().map(|o| o.to_string()).collect(),
        answer: answer.into(),
        explanation: "Because.".into(),
    }
}

#[test]
fn auto_scoring() {
    assert_eq!(auto_score("multiple_choice", "2", Some("2")), Some(1.0));
    assert_eq!(auto_score("multiple_choice", "2", Some("1")), Some(0.0));
    assert_eq!(auto_score("true_false", "true", Some("TRUE")), Some(1.0));
    assert_eq!(auto_score("short_answer", "x", Some("  ")), Some(0.0));
    assert_eq!(auto_score("short_answer", "x", Some("my answer")), None);
}

#[test]
fn full_attempt_flow() {
    let db = alexandria_lib::storage::db::open_in_memory();
    db.with(|conn| {
        conn.execute(
            "INSERT INTO books (id, title, dir_name, file_name, status, created_at, updated_at)
             VALUES ('b', 'Book', 'book-b', 'b.pdf', 'ready', 'now', 'now')",
            [],
        )?;
        conn.execute(
            "INSERT INTO sections (book_id, idx, title, start_page, end_page, word_count, status)
             VALUES ('b', 0, 'One', 1, 2, 100, 'done')",
            [],
        )?;
        let tx = conn.transaction()?;
        let stored = replace_questions(
            &tx,
            "b",
            Some(1),
            &[
                q("true_false", &[], "true"),
                q("short_answer", &[], "Model answer"),
            ],
        )?;
        assert_eq!(stored, 2);
        tx.commit()
    })
    .unwrap();

    let id = start_attempt(
        &db,
        "b",
        StartOptions {
            section_ids: vec![],
            include_book: true,
            count: 10,
            kinds: vec![],
        },
    )
    .unwrap();
    let detail = get_attempt(&db, &id).unwrap();
    assert_eq!(detail.items.len(), 2);
    assert!(detail.items.iter().all(|i| i.answer.is_none()));

    let responses = detail
        .items
        .iter()
        .map(|i| ResponseInput {
            question_id: i.question_id,
            response: Some(if i.kind == "true_false" {
                "true".into()
            } else {
                "my words".into()
            }),
        })
        .collect();
    let detail = submit_attempt(&db, &id, responses).unwrap();
    assert_eq!(detail.status, "review");
    let open = detail
        .items
        .iter()
        .find(|i| i.kind == "short_answer")
        .unwrap();
    let detail = self_grade(&db, &id, open.question_id, 0.5).unwrap();
    assert_eq!(detail.status, "graded");
    assert_eq!(detail.score, Some(0.75));

    let stats = alexandria_lib::study::mastery::stats(&db, "b").unwrap();
    assert_eq!(stats.total, 2);
    assert_eq!(stats.attempts, 1);
    assert_eq!(stats.sections[0].answered, 2);
}

#[test]
fn unanswered_questions_come_first() {
    let db = alexandria_lib::storage::db::open_in_memory();
    db.with(|conn| {
        conn.execute(
            "INSERT INTO books (id, title, dir_name, file_name, status, created_at, updated_at)
             VALUES ('b', 'Book', 'book-b', 'b.pdf', 'ready', 'now', 'now')",
            [],
        )?;
        conn.execute(
            "INSERT INTO sections (book_id, idx, title, start_page, end_page, word_count, status)
             VALUES ('b', 0, 'One', 1, 2, 100, 'done')",
            [],
        )?;
        let tx = conn.transaction()?;
        replace_questions(
            &tx,
            "b",
            Some(1),
            &[
                q("true_false", &[], "true"),
                q("true_false", &[], "false"),
                q("true_false", &[], "true"),
            ],
        )?;
        tx.commit()
    })
    .unwrap();

    let options = || StartOptions {
        section_ids: vec![],
        include_book: true,
        count: 1,
        kinds: vec![],
    };
    let mut seen = Vec::new();
    for _ in 0..3 {
        let id = start_attempt(&db, "b", options()).unwrap();
        let detail = get_attempt(&db, &id).unwrap();
        let item = &detail.items[0];
        assert!(
            !seen.contains(&item.question_id),
            "a question was repeated before all were answered"
        );
        seen.push(item.question_id);
        submit_attempt(
            &db,
            &id,
            vec![ResponseInput {
                question_id: item.question_id,
                response: Some("true".into()),
            }],
        )
        .unwrap();
    }
    assert_eq!(seen.len(), 3);
}
