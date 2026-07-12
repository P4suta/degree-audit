//! Row interpretation: the section state machine and the trailing-token parser.
//!
//! Each reconstructed row is either a **category header** (updates the section
//! breadcrumb) or a **course row** (yields a [`RawCourse`]). Course fields are
//! recovered by peeling tokens off the right of the row — term, year, grade, then
//! the numeric credit/score — leaving the course name and teacher on the left.

use audit_app::RawCourse;

/// The running section context, assembled into a `raw_category_label` breadcrumb.
///
/// The layout nests three levels: a top level in `[]`, a group level in `《》`, and
/// a leaf level in `〈〉` (or a nested `《》`). A *major* group (see
/// [`is_major_group`]) opens a fresh group and clears any leaf; any other `《》` or
/// an `〈〉` sets the leaf while preserving the parent group — which is what keeps
/// e.g. `プラットフォーム科目` in the breadcrumb of its child `基礎科目Ａ群`.
#[derive(Debug, Default, Clone)]
pub struct Section {
    top: Option<String>,
    group: Option<String>,
    sub: Option<String>,
}

impl Section {
    /// The current breadcrumb, e.g. `"専門科目 / プラットフォーム科目 / 基礎科目Ａ群"`.
    pub fn breadcrumb(&self) -> String {
        [
            self.top.as_deref(),
            self.group.as_deref(),
            self.sub.as_deref(),
        ]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join(" / ")
    }
}

/// The `《》` groups that open a new top-level branch (and reset the leaf). Every
/// other `《》` is a child leaf of the current group.
fn is_major_group(inner: &str) -> bool {
    matches!(
        inner,
        "初年次科目" | "教養科目" | "プラットフォーム科目" | "ゼミナール科目" | "選択科目"
    )
}

/// If `row_text` is a category header, apply it to `section` and return `true`.
/// Headers start with `[`, `《`, or `〈`; anything else is left to the course parser.
pub fn apply_header(section: &mut Section, row_text: &str) -> bool {
    let trimmed = row_text.trim();
    let mut chars = trimmed.chars();
    match chars.next() {
        Some('[') => {
            section.top = Some(strip_brackets(trimmed, '[', ']'));
            section.group = None;
            section.sub = None;
            true
        }
        Some('《') => {
            let inner = strip_brackets(trimmed, '《', '》');
            if is_major_group(&inner) {
                section.group = Some(inner);
                section.sub = None;
            } else {
                section.sub = Some(inner);
            }
            true
        }
        Some('〈') => {
            section.sub = Some(strip_brackets(trimmed, '〈', '〉'));
            true
        }
        _ => false,
    }
}

/// Strip a leading `open` and everything from the first `close`, returning the
/// inner label. Tolerant of trailing decoration after the closing bracket.
fn strip_brackets(text: &str, open: char, close: char) -> String {
    let without_open = text.strip_prefix(open).unwrap_or(text);
    match without_open.find(close) {
        Some(idx) => without_open[..idx].to_string(),
        None => without_open.to_string(),
    }
}

/// The single-kanji grade tokens printed in the 成績 column (per the legend
/// `秀 優 良 可 認 合 不 履`).
fn is_grade_token(text: &str) -> bool {
    matches!(text, "秀" | "優" | "良" | "可" | "認" | "合" | "不" | "履")
}

/// Expand a printed single-kanji grade to its canonical token so
/// `audit_domain::value::Grade::parse` recognizes it.
fn canonical_grade(token: &str) -> String {
    match token {
        "認" => "認定",
        "合" => "合格",
        "不" => "不可",
        "履" => "履修中",
        other => other,
    }
    .to_string()
}

/// Parse an integer token, returning `None` for anything non-numeric.
fn as_int(text: &str) -> Option<u32> {
    if text.is_empty() || !text.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    text.parse().ok()
}

/// The fields recovered from a single course row.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedRow {
    pub name: String,
    pub teacher: Option<String>,
    pub credit_text: String,
    pub score_text: Option<String>,
    pub grade_text: String,
    pub year_text: String,
    pub term_text: String,
}

/// Try to interpret `pieces` (a row's texts, left-to-right) as a course row.
///
/// Peels trailing tokens from the right: term (1–2), a two-digit year, and a
/// grade kanji. The remaining pieces hold the name, the teacher, and the numeric
/// credit (1–8) plus an optional score (0–100). Among those remaining pieces the
/// leftmost integer is the credit and — when a second integer is present — the
/// rightmost is the score; the non-numeric pieces are the name (first) and the
/// teacher run (last). Returns `None` when the row is not a well-formed course.
pub fn parse_course_row(pieces: &[String]) -> Option<ParsedRow> {
    let mut rest: Vec<&str> = pieces.iter().map(|s| s.trim()).collect();
    rest.retain(|s| !s.is_empty());

    // term (rightmost)
    let term = rest.pop()?;
    let term_val = as_int(term)?;
    if !(1..=4).contains(&term_val) {
        return None;
    }
    // year (two-digit western)
    let year = rest.pop()?;
    let year_val = as_int(year)?;
    if year.chars().count() > 2 || year_val > 99 {
        return None;
    }
    // grade kanji
    let grade = rest.pop()?;
    if !is_grade_token(grade) {
        return None;
    }

    // Remaining: name / teacher / credit / (optional) score.
    let int_positions: Vec<usize> = rest
        .iter()
        .enumerate()
        .filter(|(_, t)| as_int(t).is_some())
        .map(|(i, _)| i)
        .collect();
    let (&first_int, &last_int) = (int_positions.first()?, int_positions.last()?);

    let credit_val = as_int(rest[first_int])?;
    if !(1..=8).contains(&credit_val) {
        return None;
    }
    let credit_text = rest[first_int].to_string();
    let score_text = if last_int != first_int {
        Some(rest[last_int].to_string())
    } else {
        None
    };

    // Non-numeric pieces, in order, are the name followed by the teacher run.
    // The trailing piece is the teacher; everything before it is the name (joined
    // so a name split across fragments — e.g. `西洋近代思想演習` + `Ⅰ` — stays whole).
    let words: Vec<&str> = rest
        .iter()
        .enumerate()
        .filter(|(i, _)| *i != first_int && *i != last_int)
        .map(|(_, t)| *t)
        .collect();
    let (name, teacher) = match words.split_last() {
        Some((last, [])) => ((*last).to_string(), None),
        Some((last, head)) => (head.concat(), Some((*last).to_string())),
        None => return None,
    };
    if name.is_empty() {
        return None;
    }

    Some(ParsedRow {
        name,
        teacher,
        credit_text,
        score_text,
        grade_text: canonical_grade(grade),
        year_text: format!("{}", 2000 + year_val),
        term_text: term.to_string(),
    })
}

/// Assemble a [`RawCourse`] from a parsed row under the current section.
pub fn to_raw_course(parsed: ParsedRow, section: &Section) -> RawCourse {
    RawCourse {
        raw_category_label: section.breadcrumb(),
        name: parsed.name,
        credit_text: parsed.credit_text,
        grade_text: parsed.grade_text,
        year_text: Some(parsed.year_text),
        teacher: parsed.teacher,
        score_text: parsed.score_text,
        course_code: None,
    }
}
