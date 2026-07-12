//! Geometric reconstruction of the two-column course table.
//!
//! The transcript body is a two-column table. `pdf-glyphs` gives us positioned
//! [`Fragment`]s in content-stream order; here we recover the *visual* reading
//! order: split each page into a left and a right column at the central gutter,
//! cluster fragments into rows by their baseline `y`, and emit the rows in the
//! order a human reads them — the whole left column top-to-bottom, then the whole
//! right column, page 1 before page 2.

use pdf_glyphs::Fragment;

/// One text piece within a reconstructed row (already ordered left-to-right).
#[derive(Debug, Clone)]
pub struct Piece {
    pub text: String,
}

/// A reconstructed table row: its text pieces, left-to-right.
#[derive(Debug, Clone)]
pub struct Row {
    pub pieces: Vec<Piece>,
}

impl Row {
    /// The row's pieces joined with no separator (used for prefix inspection).
    pub fn joined(&self) -> String {
        self.pieces.iter().map(|p| p.text.as_str()).collect()
    }

    /// The row's piece texts, left-to-right.
    pub fn texts(&self) -> Vec<String> {
        self.pieces.iter().map(|p| p.text.clone()).collect()
    }
}

/// Baseline-`y` tolerance (points) for grouping fragments into one row. Rows are
/// spaced ~11.5 pt apart while pieces within a row differ by at most ~1.5 pt, so
/// a 4.0 pt window separates rows cleanly without ever merging two of them.
const Y_TOLERANCE: f32 = 4.0;

/// Fragments at or above this baseline `y` belong to the page header (title,
/// student block, column captions) and are never course rows. The first course
/// baseline sits near y≈686 and the column-caption row near y≈699.
const BODY_TOP_Y: f32 = 696.0;

/// Search band (in `x`) for the central gutter between the two columns. Kept
/// tight around the page centre so intra-column gaps (e.g. between the 年度 and 期
/// columns near x≈281→298) are never mistaken for the gutter; the only fragment
/// boundary inside this band is the left column's 期 (~x298) against the right
/// column's 科目名 (~x305).
const GUTTER_BAND: (f32, f32) = (290.0, 320.0);

/// Fallback gutter `x` if the band is empty (e.g. a page with no right column).
const GUTTER_FALLBACK: f32 = 302.0;

/// Locate the central gutter for one page: the widest horizontal gap between
/// consecutive fragment `x` positions inside [`GUTTER_BAND`]. The left column's
/// rightmost data (期) sits near x≈298 and the right column's leftmost text (科目名)
/// near x≈305, so the widest gap in the band is exactly the gutter.
fn detect_gutter(fragments: &[&Fragment]) -> f32 {
    let mut xs: Vec<f32> = fragments
        .iter()
        .map(|f| f.x)
        .filter(|&x| x >= GUTTER_BAND.0 && x <= GUTTER_BAND.1)
        .collect();
    xs.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mut best_gap = 0.0f32;
    let mut gutter = GUTTER_FALLBACK;
    for pair in xs.windows(2) {
        let gap = pair[1] - pair[0];
        if gap > best_gap {
            best_gap = gap;
            gutter = (pair[0] + pair[1]) / 2.0;
        }
    }
    gutter
}

/// Cluster a column's fragments into rows by baseline `y`, highest (top of page)
/// first; pieces within each row are ordered left-to-right by `x`.
fn cluster_rows(mut column: Vec<&Fragment>) -> Vec<Row> {
    column.sort_by(|a, b| b.y.partial_cmp(&a.y).unwrap_or(std::cmp::Ordering::Equal));
    let mut rows: Vec<Row> = Vec::new();
    let mut current: Vec<&Fragment> = Vec::new();
    let mut ref_y = f32::INFINITY;
    for frag in column {
        if (ref_y - frag.y).abs() > Y_TOLERANCE {
            if !current.is_empty() {
                rows.push(finish_row(std::mem::take(&mut current)));
            }
            ref_y = frag.y;
        }
        current.push(frag);
    }
    if !current.is_empty() {
        rows.push(finish_row(current));
    }
    rows
}

fn finish_row(mut frags: Vec<&Fragment>) -> Row {
    frags.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal));
    Row {
        pieces: frags
            .into_iter()
            .map(|f| Piece {
                text: f.text.clone(),
            })
            .collect(),
    }
}

/// Reconstruct every body row across both pages in visual reading order:
/// page 1 left column, page 1 right column, page 2 left column, page 2 right column.
pub fn reconstruct_rows(fragments: &[Fragment]) -> Vec<Row> {
    let mut pages: Vec<u16> = fragments.iter().map(|f| f.page).collect();
    pages.sort_unstable();
    pages.dedup();

    let mut rows = Vec::new();
    for page in pages {
        let body: Vec<&Fragment> = fragments
            .iter()
            .filter(|f| f.page == page && f.y < BODY_TOP_Y)
            .collect();
        if body.is_empty() {
            continue;
        }
        let gutter = detect_gutter(&body);
        let left: Vec<&Fragment> = body.iter().copied().filter(|f| f.x < gutter).collect();
        let right: Vec<&Fragment> = body.iter().copied().filter(|f| f.x >= gutter).collect();
        rows.extend(cluster_rows(left));
        rows.extend(cluster_rows(right));
    }
    rows
}
