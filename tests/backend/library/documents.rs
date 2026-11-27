use alexandria_lib::library::documents::strip_leading_h1;

#[test]
fn strips_duplicate_title() {
    assert_eq!(strip_leading_h1("# Title\n\n## Body"), "## Body");
    assert_eq!(strip_leading_h1("## Body"), "## Body");
}
