//! Japanese rendering of the domain's structured [`Diagnostic`] facts.
//!
//! The domain returns machine-readable diagnostics; localizing them into prose is
//! a presentation concern and lives here, at the driving-adapter boundary.

use audit_domain::spec::result::Diagnostic;

/// Render one diagnostic as a Japanese line.
pub fn format_diagnostic(d: &Diagnostic) -> String {
    match d {
        Diagnostic::Progress {
            actual,
            required,
            unit,
        } => format!("{actual} / {required} {}", unit.token()),
        Diagnostic::Total { actual, required } => {
            format!("合計 {actual} / {required} 単位")
        }
        Diagnostic::KindCredits { kind, credits } => {
            format!("{}: {credits} 単位", kind.display_name())
        }
        Diagnostic::FieldCredits { field, credits } => {
            format!("{}: {credits} 単位", field.label())
        }
        Diagnostic::LanguageCredits {
            language,
            credits,
            allowed,
        } => format!(
            "{}: {credits} 単位{}",
            language.name(),
            if *allowed {
                ""
            } else {
                "（必修対象外）"
            }
        ),
        Diagnostic::SubjectStatus {
            display,
            acquired,
            credits,
        } => {
            if *acquired {
                format!("{display}: 取得済み（{credits} 単位）")
            } else {
                format!("{display}: 未取得")
            }
        }
        Diagnostic::Cap {
            label,
            cap,
            counted,
            raw,
        } => format!("{label} 上限 {cap} 単位: 算入 {counted} / 履修 {raw} 単位"),
        Diagnostic::Frame { label, used, cap } => {
            format!("{label}: {used} / {cap} 単位")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use audit_domain::spec::result::Unit;

    #[test]
    fn renders_progress() {
        let d = Diagnostic::Progress {
            actual: 12,
            required: 12,
            unit: Unit::Credit,
        };
        assert_eq!(format_diagnostic(&d), "12 / 12 単位");
    }

    #[test]
    fn renders_subject_status() {
        let d = Diagnostic::SubjectStatus {
            display: "大学基礎論".to_owned(),
            acquired: false,
            credits: 0,
        };
        assert_eq!(format_diagnostic(&d), "大学基礎論: 未取得");
    }
}
