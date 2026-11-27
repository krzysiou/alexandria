use alexandria_lib::library::sections::*;

fn pages(words_per_page: &[usize]) -> Vec<String> {
    words_per_page.iter().map(|n| "word ".repeat(*n)).collect()
}

fn entry(title: &str, page: usize) -> OutlineEntry {
    OutlineEntry {
        title: title.into(),
        page,
    }
}

#[test]
fn empty_book() {
    assert!(plan(&[], &[]).is_empty());
}

#[test]
fn scanned_book_uses_vision_chunks() {
    let plan = plan(&pages(&[3; 40]), &[]);
    assert_eq!(plan.len(), 3);
    assert!(plan.iter().all(|s| s.mode == "vision"));
    assert_eq!((plan[2].start_page, plan[2].end_page), (31, 40));
}

#[test]
fn no_outline_chunks_by_size() {
    let plan = plan(&pages(&[500; 60]), &[]);
    assert!(plan.len() >= 4);
    assert_eq!(plan.first().unwrap().start_page, 1);
    assert_eq!(plan.last().unwrap().end_page, 60);
    assert!(plan
        .iter()
        .all(|s| s.placeholder && s.word_count <= MAX_WORDS));
    for pair in plan.windows(2) {
        assert_eq!(pair[0].end_page + 1, pair[1].start_page);
    }
}

#[test]
fn outline_sections_with_front_matter_merge() {
    let book = pages(&[100, 100, 500, 500, 500, 500, 500, 500, 500, 500]);
    let outline = [entry("Chapter 1", 3), entry("Chapter 2", 7)];
    let plan = plan(&book, &outline);
    assert_eq!(plan.len(), 2);
    assert_eq!(plan[0].title, "Chapter 1");
    assert_eq!((plan[0].start_page, plan[0].end_page), (1, 6));
    assert_eq!(plan[1].title, "Chapter 2");
    assert_eq!((plan[1].start_page, plan[1].end_page), (7, 10));
}

#[test]
fn huge_chapter_is_split() {
    let book = pages(&[1000; 30]);
    let outline = [entry("Intro", 1), entry("Big", 3)];
    let plan = plan(&book, &outline);
    assert!(plan.iter().any(|s| s.title.starts_with("Big (part 1 of")));
    assert!(plan.iter().all(|s| s.word_count <= MAX_WORDS));
    assert_eq!(plan.last().unwrap().end_page, 30);
}
