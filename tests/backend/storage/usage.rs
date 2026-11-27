use alexandria_lib::storage::{
    db::open_in_memory,
    usage::{latest, record, UsageLimits},
};

fn limits(five_hour: f64, resets_at: i64) -> UsageLimits {
    UsageLimits {
        five_hour,
        five_hour_resets_at: resets_at,
        seven_day: Some(0.3),
        seven_day_resets_at: Some(9_999),
    }
}

#[test]
fn records_cost_per_book_and_latest_limits() {
    let db = open_in_memory();
    db.with(|conn| {
        conn.execute(
            "INSERT INTO books (id, title, dir_name, file_name, status, created_at, updated_at)
             VALUES ('b', 'Book', 'book-b', 'b.pdf', 'processing', 'now', 'now')",
            [],
        )?;
        record(conn, "b", 0.5, Some(&limits(0.45, 100)))?;
        record(conn, "b", 0.25, Some(&limits(0.52, 100)))?;
        record(conn, "b", 0.25, None)?;

        let cost: f64 = conn.query_row("SELECT cost_usd FROM books WHERE id = 'b'", [], |r| {
            r.get(0)
        })?;
        assert_eq!(cost, 1.0);
        Ok(())
    })
    .unwrap();

    let snapshot = latest(&db).unwrap().unwrap();
    assert_eq!(snapshot.limits.five_hour, 0.52);
}
