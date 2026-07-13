//! The graduation assessment service.
//!
//! Pure computation with no I/O, so it lives in the domain. Runs the allocation
//! pipeline over passing courses, evaluates the standalone total-credits and
//! thesis-eligibility requirements against the full pool, and — when there are
//! in-progress courses — a tentative "if everything passes" re-run.

use serde::{Deserialize, Serialize};

use crate::allocation::{StepOutcome, run_pipeline};
use crate::entity::academic_record::{AcademicRecord, SharedCourse};
use crate::ruleset::RuleSet;
use crate::spec::evaluate::evaluate;
use crate::spec::result::{EvalContext, SpecResult};
use crate::value::Credit;

/// The full assessment of a record against a rule set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Assessment {
    pub steps: Vec<StepOutcome>,
    pub leftover_courses: Vec<SharedCourse>,
    pub total: SpecResult,
    pub thesis_eligibility: SpecResult,
    pub total_credits: Credit,
    pub total_credits_required: u32,
    pub graduatable: bool,
    pub in_progress_credits: Credit,
    pub in_progress_courses: Vec<SharedCourse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tentative: Option<TentativeAssessment>,
}

/// The "if all in-progress courses pass" projection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TentativeAssessment {
    pub steps: Vec<StepOutcome>,
    pub total: SpecResult,
    pub thesis_eligibility: SpecResult,
    pub graduatable: bool,
}

struct CoreAssessment {
    steps: Vec<StepOutcome>,
    leftover: Vec<SharedCourse>,
    total: SpecResult,
    thesis: SpecResult,
    graduatable: bool,
}

fn run_core(pool: &[SharedCourse], rule_set: &RuleSet) -> CoreAssessment {
    let pipeline = run_pipeline(pool, &rule_set.requirements);
    let ctx = EvalContext::new(pool);
    // total-credits and thesis eligibility look at the whole pool, not the leftover.
    let total = evaluate(&rule_set.total_requirement, &ctx);
    let thesis = evaluate(&rule_set.thesis_eligibility, &ctx);
    let graduatable = pipeline.steps.iter().all(|s| s.result.satisfied) && total.satisfied;
    CoreAssessment {
        steps: pipeline.steps,
        leftover: pipeline.leftover,
        total,
        thesis,
        graduatable,
    }
}

/// Assess a record against a rule set.
pub fn assess(record: &AcademicRecord, rule_set: &RuleSet) -> Assessment {
    let passed = record.passed_courses();
    let current = run_core(&passed, rule_set);
    let total_credits = record.total_credits();
    let in_progress_courses = record.in_progress_courses();
    let in_progress_credits = record.in_progress_credits();

    let tentative = if in_progress_courses.is_empty() {
        None
    } else {
        let pool = record.passed_or_in_progress_courses();
        let t = run_core(&pool, rule_set);
        Some(TentativeAssessment {
            steps: t.steps,
            total: t.total,
            thesis_eligibility: t.thesis,
            graduatable: t.graduatable,
        })
    };

    Assessment {
        steps: current.steps,
        leftover_courses: current.leftover,
        total: current.total,
        thesis_eligibility: current.thesis,
        total_credits,
        total_credits_required: rule_set.total_credits_required,
        graduatable: current.graduatable,
        in_progress_credits,
        in_progress_courses,
        tentative,
    }
}
