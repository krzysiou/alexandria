use std::path::PathBuf;

use alexandria_lib::library::{books::export_pdf, import::clean_page};

#[test]
fn cleans_pages() {
    assert_eq!(clean_page("  a   b \n\n\n\n c "), "a b\n\nc");
}

/// A fresh, empty temporary directory.
fn temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join(format!("alexandria-test-{}", uuid::Uuid::new_v4().simple()));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn exports_the_stored_pdf() {
    let library = temp_dir();
    std::fs::write(library.join("book.pdf"), b"%PDF-1.7 test").unwrap();
    let target = temp_dir();

    let saved = export_pdf(&library, &target.join("My Book.pdf")).unwrap();
    assert_eq!(saved, target.join("My Book.pdf"));
    assert_eq!(std::fs::read(&saved).unwrap(), b"%PDF-1.7 test");

    let renamed = export_pdf(&library, &target.join("copy")).unwrap();
    assert_eq!(renamed, target.join("copy.pdf"));
}

#[test]
fn export_fails_without_a_stored_pdf() {
    let library = temp_dir();
    let error = export_pdf(&library, &library.join("out.pdf")).unwrap_err();
    assert!(error.to_string().contains("missing"));
}
