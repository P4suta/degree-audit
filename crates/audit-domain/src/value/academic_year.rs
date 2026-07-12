//! Academic years. The canonical form is the Western calendar year; [`Wareki`]
//! (Japanese era year) exists only at the parse boundary and maps into it.
//!
//! The transcript body numbers course years with the last two Western digits
//! (e.g. `22` → 2022), while header dates use Japanese eras (e.g. 令和4 → 2022).

use serde::{Deserialize, Serialize};

/// A Western calendar academic year (e.g. 2022). Serializes as a plain integer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct AcademicYear(u16);

impl AcademicYear {
    pub const fn new(year: u16) -> AcademicYear {
        AcademicYear(year)
    }

    pub const fn get(self) -> u16 {
        self.0
    }

    /// Expand a two-digit Western year from the transcript body (e.g. `22` → 2022).
    /// Values are assumed to be 21st-century.
    pub const fn from_two_digit(yy: u16) -> AcademicYear {
        AcademicYear(2000 + yy)
    }
}

/// A Japanese imperial era relevant to current transcripts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Era {
    /// 令和 — from 2019.
    Reiwa,
    /// 平成 — 1989–2019.
    Heisei,
    /// 昭和 — 1926–1989.
    Showa,
}

impl Era {
    /// The Western year corresponding to year 0 of the era, such that
    /// `year N → offset + N`.
    const fn offset(self) -> u16 {
        match self {
            Era::Reiwa => 2018,
            Era::Heisei => 1988,
            Era::Showa => 1925,
        }
    }
}

/// A Japanese era-year, as printed in transcript header dates (e.g. 令和4年).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Wareki {
    pub era: Era,
    pub year: u8,
}

impl Wareki {
    pub const fn new(era: Era, year: u8) -> Wareki {
        Wareki { era, year }
    }

    /// Convert to the Western academic year (令和4 → 2022).
    pub const fn to_western(self) -> AcademicYear {
        AcademicYear(self.era.offset() + self.year as u16)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reiwa_maps_to_western() {
        assert_eq!(
            Wareki::new(Era::Reiwa, 4).to_western(),
            AcademicYear::new(2022)
        );
        assert_eq!(
            Wareki::new(Era::Reiwa, 6).to_western(),
            AcademicYear::new(2024)
        );
        assert_eq!(
            Wareki::new(Era::Reiwa, 8).to_western(),
            AcademicYear::new(2026)
        );
    }

    #[test]
    fn heisei_maps_to_western() {
        // 平成15年 → 2003 (birthdate era on the sample transcript).
        assert_eq!(
            Wareki::new(Era::Heisei, 15).to_western(),
            AcademicYear::new(2003)
        );
    }

    #[test]
    fn two_digit_body_year_expands() {
        assert_eq!(AcademicYear::from_two_digit(22), AcademicYear::new(2022));
        assert_eq!(AcademicYear::from_two_digit(26), AcademicYear::new(2026));
    }

    #[test]
    fn serializes_as_integer() {
        assert_eq!(
            serde_json::to_string(&AcademicYear::new(2022)).unwrap(),
            "2022"
        );
    }
}
