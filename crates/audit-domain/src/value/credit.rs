//! A credit count.
//!
//! This university awards whole credits only, so a non-negative integer newtype
//! makes negative and non-finite values unrepresentable by construction — the two
//! failure modes a runtime guard would catch vanish at the type level. Text
//! parsing (which *can* fail) lives at the app-layer mapper boundary.

use std::iter::Sum;
use std::ops::Add;

use serde::{Deserialize, Serialize};

/// A non-negative whole number of credits. Serializes transparently as an integer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Credit(u32);

impl Credit {
    /// Zero credits.
    pub const ZERO: Credit = Credit(0);

    /// Construct from a whole credit count.
    pub const fn new(value: u32) -> Credit {
        Credit(value)
    }

    /// The underlying whole credit count.
    pub const fn get(self) -> u32 {
        self.0
    }

    /// Whether this reaches a threshold.
    pub const fn is_at_least(self, threshold: Credit) -> bool {
        self.0 >= threshold.0
    }
}

impl Add for Credit {
    type Output = Credit;
    fn add(self, rhs: Credit) -> Credit {
        Credit(self.0 + rhs.0)
    }
}

impl Sum for Credit {
    fn sum<I: Iterator<Item = Credit>>(iter: I) -> Credit {
        Credit(iter.map(Credit::get).sum())
    }
}

impl From<u32> for Credit {
    fn from(value: u32) -> Credit {
        Credit(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_is_zero() {
        assert_eq!(Credit::ZERO.get(), 0);
    }

    #[test]
    fn add_and_sum() {
        assert_eq!((Credit::new(2) + Credit::new(6)).get(), 8);
        let total: Credit = [Credit::new(2), Credit::new(2), Credit::new(8)]
            .into_iter()
            .sum();
        assert_eq!(total.get(), 12);
    }

    #[test]
    fn is_at_least() {
        assert!(Credit::new(40).is_at_least(Credit::new(40)));
        assert!(Credit::new(41).is_at_least(Credit::new(40)));
        assert!(!Credit::new(39).is_at_least(Credit::new(40)));
    }

    #[test]
    fn serializes_as_plain_integer() {
        assert_eq!(serde_json::to_string(&Credit::new(124)).unwrap(), "124");
    }
}
