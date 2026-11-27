use alexandria_lib::storage::paths::slugify;

#[test]
fn slugify_basic() {
    assert_eq!(
        slugify("Thinking, Fast and Slow!", 60),
        "thinking-fast-and-slow"
    );
    assert_eq!(slugify("  ---  ", 60), "untitled");
    assert_eq!(slugify("Żółta Łódź", 60), "żółta-łódź");
    assert_eq!(slugify("abcdefghij", 4), "abcd");
}
