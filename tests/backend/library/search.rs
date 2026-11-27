use alexandria_lib::library::search::{plain_text, snippet, terms};

#[test]
fn builds_lowercase_terms() {
    assert_eq!(
        terms("  Typy  Generyczne "),
        vec!["typy".to_string(), "generyczne".to_string()]
    );
    assert!(terms("a").is_empty());
}

#[test]
fn strips_markdown() {
    assert_eq!(
        plain_text("## Title\n\n- **bold** item\n> quote `code`"),
        "Title bold item quote code"
    );
}

#[test]
fn snippet_centres_on_match() {
    let text = format!("{} needle here {}", "a ".repeat(100), "b ".repeat(100));
    let excerpt = snippet(&text, &terms("NEEDLE"));
    assert!(excerpt.contains("needle here"));
    assert!(excerpt.starts_with('…') && excerpt.ends_with('…'));
}
