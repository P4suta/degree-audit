//! CLI errors rendered as miette diagnostics.
//!
//! The domain speaks in [`DomainError`]s that already carry a Japanese
//! `user_message`; here we promote that to the headline, keep the machine `code`,
//! and surface the developer detail as help. `io`/`serde_json` failures get their
//! own Japanese wording.

use std::fmt;

use audit_domain::DomainError;
use miette::Diagnostic;

/// A user-facing CLI error.
#[derive(Debug)]
pub struct CliError {
    /// Headline shown to the user (Japanese where available).
    message: String,
    /// Stable machine code, when known.
    code: Option<String>,
    /// Supplementary help / developer detail.
    help: Option<String>,
}

impl CliError {
    /// A bare error with just a headline.
    pub fn new(message: impl Into<String>) -> CliError {
        CliError {
            message: message.into(),
            code: None,
            help: None,
        }
    }

    /// Attach a machine-readable code.
    #[must_use]
    pub fn with_code(mut self, code: impl Into<String>) -> CliError {
        self.code = Some(code.into());
        self
    }

    /// Attach a help / recovery hint.
    #[must_use]
    pub fn with_help(mut self, help: impl Into<String>) -> CliError {
        self.help = Some(help.into());
        self
    }
}

impl fmt::Display for CliError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for CliError {}

impl Diagnostic for CliError {
    fn code(&self) -> Option<Box<dyn fmt::Display + '_>> {
        self.code
            .as_ref()
            .map(|c| Box::new(c.clone()) as Box<dyn fmt::Display>)
    }

    fn help(&self) -> Option<Box<dyn fmt::Display + '_>> {
        self.help
            .as_ref()
            .map(|h| Box::new(h.clone()) as Box<dyn fmt::Display>)
    }
}

impl From<DomainError> for CliError {
    fn from(e: DomainError) -> CliError {
        CliError {
            message: e.user_message,
            code: Some(e.code.as_str().to_owned()),
            help: Some(e.message),
        }
    }
}

impl From<std::io::Error> for CliError {
    fn from(e: std::io::Error) -> CliError {
        CliError::new(format!("ファイルを読み込めませんでした: {e}"))
            .with_code("IO")
            .with_help("指定したパスが存在し、読み取り権限があるか確認してください。")
    }
}

impl From<serde_json::Error> for CliError {
    fn from(e: serde_json::Error) -> CliError {
        CliError::new(format!("JSON を解釈できませんでした: {e}"))
            .with_code("JSON")
            .with_help("RawCourse オブジェクトの配列になっているか確認してください。")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use audit_domain::error::ErrorCode;

    #[test]
    fn domain_error_surfaces_user_message_as_headline() {
        let domain = DomainError::new(
            ErrorCode::RuleSetNotFound,
            "no rule set applies",
            "適用できる卒業要件ルールが見つかりませんでした。",
        );
        let cli = CliError::from(domain);
        assert_eq!(
            cli.to_string(),
            "適用できる卒業要件ルールが見つかりませんでした。"
        );
        assert_eq!(
            cli.code().map(|c| c.to_string()),
            Some("DEGREE_AUDIT/RULESET/NOT_FOUND".to_owned())
        );
        assert_eq!(
            cli.help().map(|h| h.to_string()),
            Some("no rule set applies".to_owned())
        );
    }
}
