use std::fmt;

const DEFAULT_CALL_ESTIMATE: f64 = 0.15;
const MIN_CALL_BUDGET: f64 = 0.05;

#[derive(Debug, Clone, PartialEq)]
pub struct CapReached {
    pub spent: f64,
    pub cap: f64,
}

impl fmt::Display for CapReached {
    /// The message shown on the book when parsing stops at the cap.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Spending cap reached: ${:.2} of ${:.2} used. Raise the cap in Settings → Parsing and press Resume.",
            self.spent, self.cap
        )
    }
}

impl std::error::Error for CapReached {}

#[derive(Debug)]
pub struct Budget {
    cap: f64,
    spent: f64,
    running: usize,
    calls: usize,
    call_cost: f64,
}

impl Budget {
    /// Budget for one book: `cap` dollars in total, `spent` of them already used.
    pub fn new(cap: f64, spent: f64) -> Self {
        Self { cap, spent, running: 0, calls: 0, call_cost: 0.0 }
    }

    /// Expected cost of a call: the average of this run's calls so far.
    fn estimate(&self) -> f64 {
        if self.calls > 0 {
            self.call_cost / self.calls as f64
        } else {
            DEFAULT_CALL_ESTIMATE
        }
    }

    /// Reserves room for a call expected to cost `weight` average calls. Fails
    /// when the money spent, plus the calls still running, plus this one could
    /// exceed the cap. Returns the most this call may spend.
    pub fn reserve(&mut self, weight: f64) -> Result<f64, CapReached> {
        let estimate = self.estimate();
        let committed = self.spent + self.running as f64 * estimate;
        if committed + estimate * weight > self.cap {
            return Err(CapReached { spent: self.spent, cap: self.cap });
        }

        self.running += 1;
        Ok((self.cap - committed).max(MIN_CALL_BUDGET))
    }

    /// Records the end of a reserved call and what it cost (None when it failed).
    pub fn settle(&mut self, cost: Option<f64>) {
        self.running = self.running.saturating_sub(1);
        if let Some(cost) = cost {
            self.spent += cost;
            self.calls += 1;
            self.call_cost += cost;
        }
    }

    /// Money spent on the book so far.
    pub fn spent(&self) -> f64 {
        self.spent
    }
}
