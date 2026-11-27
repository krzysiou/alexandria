use alexandria_lib::storage::settings::*;

#[test]
fn roundtrip_and_sanitize() {
    let db = alexandria_lib::storage::db::open_in_memory();
    assert_eq!(load(&db).unwrap().model, "sonnet");
    let saved = save(
        &db,
        Settings {
            theme: "neon".into(),
            concurrency: 99,
            model: "opus".into(),
            ..Settings::default()
        },
    )
    .unwrap();
    assert_eq!(saved.theme, "system");
    assert_eq!(saved.concurrency, 6);
    let loaded = load(&db).unwrap();
    assert_eq!(loaded.model, "opus");
    assert_eq!(loaded.concurrency, 6);
}
