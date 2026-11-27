use alexandria_lib::study::questions::*;

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
fn normalizes_multiple_choice() {
    let n = normalize(&q(
        "multiple_choice",
        &["Red", "Green", "Blue", "Black"],
        "blue",
    ))
    .unwrap();
    assert_eq!(n.difficulty, "hard");
    assert_eq!(n.prompt, "Why?");
    let idx: usize = n.answer.parse().unwrap();
    assert_eq!(n.options[idx], "Blue");
    let n = normalize(&q("multiple_choice", &["Red", "Green", "Blue"], "B")).unwrap();
    assert_eq!(n.options[n.answer.parse::<usize>().unwrap()], "Green");
    assert!(normalize(&q("multiple_choice", &["Red", "Green"], "Purple")).is_none());
    assert!(normalize(&q("multiple_choice", &["Only"], "Only")).is_none());
}

#[test]
fn normalizes_true_false_and_open() {
    assert_eq!(
        normalize(&q("true_false", &[], "False")).unwrap().answer,
        "false"
    );
    assert!(normalize(&q("true_false", &[], "maybe")).is_none());
    assert_eq!(
        normalize(&q("short_answer", &[], " Model "))
            .unwrap()
            .answer,
        "Model"
    );
    assert!(normalize(&q("short_answer", &[], "")).is_none());
    assert!(normalize(&q("essay", &[], "x")).is_none());
}
