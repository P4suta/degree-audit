//! The allocation pipeline: a pure fold that threads a shrinking course pool
//! through consumption-strateged steps.
//!
//! This is deliberately *not* part of the requirement AST: tree nodes are
//! stateless `(rule, pool) -> result`, whereas the pipeline carries `remaining`
//! state between steps. "Upstream overflow flows downstream" is emergent —
//! `ConsumeRequired` removes only the credits a step needs, leaving the surplus
//! in the pool for later steps (e.g. the elective) to pick up.

use std::collections::HashSet;

use serde::{Deserialize, Serialize};

use crate::entity::academic_record::SharedCourse;
use crate::spec::evaluate::evaluate;
use crate::spec::requirement::Requirement;
use crate::spec::result::{EvalContext, SpecResult};
use crate::value::CourseId;

/// How much of a step's contributing courses to remove from the pool.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Strategy {
    /// Remove only up to `result.required` credits worth of contributing courses.
    ConsumeRequired,
    /// Remove every contributing course, regardless of credit count.
    ConsumeAll,
    /// Read the pool without removing anything.
    Observe,
}

/// A pipeline step: a requirement plus its consumption strategy.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Step {
    pub requirement: Requirement,
    pub strategy: Strategy,
}

impl Step {
    pub fn new(requirement: Requirement, strategy: Strategy) -> Step {
        Step {
            requirement,
            strategy,
        }
    }
}

/// One evaluated step, with the ids it consumed from the pool.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepOutcome {
    pub id: String,
    pub label: String,
    pub result: SpecResult,
    pub consumed_course_ids: Vec<CourseId>,
}

/// The outcome of the whole fold.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PipelineOutcome {
    pub steps: Vec<StepOutcome>,
    pub leftover: Vec<SharedCourse>,
}

/// Take contributing courses until their summed credit reaches `limit`.
fn take_up_to(courses: &[SharedCourse], limit: u32) -> Vec<SharedCourse> {
    let mut out = Vec::new();
    let mut taken = 0u32;
    for course in courses {
        if taken >= limit {
            break;
        }
        out.push(course.clone());
        taken += course.credit.get();
    }
    out
}

fn select_consumed(result: &SpecResult, strategy: Strategy) -> Vec<SharedCourse> {
    match strategy {
        Strategy::ConsumeAll => result.contributing.clone(),
        Strategy::ConsumeRequired => take_up_to(&result.contributing, result.required),
        Strategy::Observe => Vec::new(),
    }
}

/// Run the pipeline: each step sees the pool left by prior steps.
pub fn run_pipeline(pool: &[SharedCourse], steps: &[Step]) -> PipelineOutcome {
    let mut remaining: Vec<SharedCourse> = pool.to_vec();
    let mut outcomes = Vec::with_capacity(steps.len());

    for step in steps {
        let result = {
            let ctx = EvalContext::new(&remaining);
            evaluate(&step.requirement, &ctx)
        };
        let consumed = select_consumed(&result, step.strategy);

        // Preserve first-seen order for the id list; use a set for the retain filter.
        let mut consumed_ids = Vec::new();
        let mut consumed_set = HashSet::new();
        for course in &consumed {
            if consumed_set.insert(course.id.clone()) {
                consumed_ids.push(course.id.clone());
            }
        }
        remaining.retain(|c| !consumed_set.contains(&c.id));

        outcomes.push(StepOutcome {
            id: step.requirement.id.clone(),
            label: step.requirement.label.clone(),
            result,
            consumed_course_ids: consumed_ids,
        });
    }

    PipelineOutcome {
        steps: outcomes,
        leftover: remaining,
    }
}
