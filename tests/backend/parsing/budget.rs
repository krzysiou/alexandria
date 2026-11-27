use alexandria_lib::parsing::budget::{Budget, CapReached};

#[test]
fn reserves_until_the_cap_would_be_exceeded() {
    let mut budget = Budget::new(1.0, 0.0);

    let ceiling = budget.reserve(1.0).unwrap();
    assert!((ceiling - 1.0).abs() < 1e-9);
    budget.settle(Some(0.30));

    assert!(budget.reserve(1.0).is_ok());
    assert!(budget.reserve(1.0).is_ok());
    assert_eq!(
        budget.reserve(1.0),
        Err(CapReached {
            spent: 0.30,
            cap: 1.0
        })
    );
}

#[test]
fn running_calls_count_against_the_cap() {
    let mut budget = Budget::new(0.5, 0.2);
    assert!(budget.reserve(1.0).is_ok());
    assert!(budget.reserve(1.0).is_ok());
    assert!(budget.reserve(1.0).is_err());

    budget.settle(None);
    assert!(budget.reserve(1.0).is_ok());
}

#[test]
fn heavier_calls_need_more_room() {
    let mut budget = Budget::new(1.0, 0.75);
    assert!(budget.reserve(2.0).is_err());
    assert!(budget.reserve(1.0).is_ok());
}

#[test]
fn already_over_the_cap_stops_immediately() {
    let mut budget = Budget::new(5.0, 5.2);
    let reached = budget.reserve(1.0).unwrap_err();
    assert!(reached.to_string().contains("$5.20 of $5.00"));
    assert!((budget.spent() - 5.2).abs() < 1e-9);
}
