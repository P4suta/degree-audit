//! End-to-end assessment test for the default rule set, using a synthetic
//! transcript (no real student data) built to just satisfy every requirement.
//!
//! This exercises the whole engine: pipeline fold, consumption strategies,
//! upstream-overflow-to-elective, the standalone total requirement, and the
//! graduatable decision.

use std::sync::Arc;

use audit_domain::assess::assess;
use audit_domain::entity::academic_record::{AcademicRecord, SharedCourse};
use audit_domain::entity::course::{Course, CourseInput};
use audit_domain::entity::student_profile::StudentProfile;
use audit_domain::ruleset::default;
use audit_domain::value::{CourseId, Credit, FieldCategory, Grade, Language, SubjectCategory};

fn course(id: &str, name: &str, credit: u32, category: SubjectCategory) -> SharedCourse {
    Arc::new(
        Course::of(CourseInput {
            id: CourseId::of(id).unwrap(),
            name: name.to_owned(),
            credit: Credit::new(credit),
            grade: Grade::Yu, // passing
            category,
            raw_category_label: String::new(),
            year: Some(2022),
            teacher: None,
            score: None,
        })
        .unwrap(),
    )
}

fn synthetic_passing_transcript() -> Vec<SharedCourse> {
    let mut courses = Vec::new();
    let mut n = 0;
    let mut push =
        |name: &str, credit: u32, category: SubjectCategory, courses: &mut Vec<SharedCourse>| {
            n += 1;
            courses.push(course(&format!("c{n:03}"), name, credit, category));
        };

    // Primary: the six named subjects, 2 credits each (12 total).
    for name in [
        "大学基礎論",
        "大学英語入門I",
        "英会話I",
        "情報処理",
        "学問基礎論",
        "課題探求実践セミナー",
    ] {
        push(name, 2, SubjectCategory::CommonPrimary, &mut courses);
    }

    // Liberal 28: 3 fields + one language (4) + career at cap (6).
    for i in 0..5 {
        push(
            &format!("人文教養{i}"),
            2,
            SubjectCategory::LiberalField {
                field: FieldCategory::Humanities,
            },
            &mut courses,
        ); // 10
    }
    for i in 0..2 {
        push(
            &format!("社会教養{i}"),
            2,
            SubjectCategory::LiberalField {
                field: FieldCategory::Social,
            },
            &mut courses,
        ); // 4
    }
    for i in 0..2 {
        push(
            &format!("自然教養{i}"),
            2,
            SubjectCategory::LiberalField {
                field: FieldCategory::Natural,
            },
            &mut courses,
        ); // 4
    }
    for name in ["中国語I", "中国語II"] {
        push(
            name,
            2,
            SubjectCategory::LiberalForeignLanguage {
                language: Language::Chinese,
            },
            &mut courses,
        ); // 4
    }
    for i in 0..3 {
        push(
            &format!("キャリア科目{i}"),
            2,
            SubjectCategory::LiberalCareer,
            &mut courses,
        ); // 6
    }

    // Seminars.
    for name in ["基礎演習I", "基礎演習II"] {
        push(name, 2, SubjectCategory::Seminar12, &mut courses); // 4
    }
    push("演習I", 2, SubjectCategory::Seminar34Spring, &mut courses);
    push("演習II", 2, SubjectCategory::Seminar34Fall, &mut courses);
    push(
        "卒業論文",
        8,
        SubjectCategory::Seminar56Thesis,
        &mut courses,
    );

    // Platform 30.
    for i in 0..2 {
        push(
            &format!("基礎A{i}"),
            2,
            SubjectCategory::PlatformBasicA,
            &mut courses,
        ); // 4
    }
    for i in 0..2 {
        push(
            &format!("基礎B{i}"),
            2,
            SubjectCategory::PlatformBasicB,
            &mut courses,
        ); // 4
    }
    for i in 0..2 {
        push(
            &format!("PF外国語{i}"),
            2,
            SubjectCategory::PlatformForeignLanguage,
            &mut courses,
        ); // 4
    }
    for i in 0..9 {
        push(
            &format!("PF発展{i}"),
            2,
            SubjectCategory::PlatformAdvanced,
            &mut courses,
        ); // 18
    }

    // Elective 40 (own course).
    for i in 0..20 {
        push(
            &format!("専門選択{i}"),
            2,
            SubjectCategory::ElectiveOwnCourse,
            &mut courses,
        ); // 40
    }

    courses
}

#[test]
fn synthetic_transcript_is_graduatable_under_default() {
    let profile = StudentProfile::new("人文社会科学部", "人文科学コース", 2022).unwrap();
    let record = AcademicRecord::new(profile, synthetic_passing_transcript());
    let rule_set = default::rule_set();

    let assessment = assess(&record, &rule_set);

    // Every pipeline step must be satisfied.
    for step in &assessment.steps {
        assert!(
            step.result.satisfied,
            "step '{}' not satisfied: {}/{} {}",
            step.label,
            step.result.actual,
            step.result.required,
            step.result.unit.token()
        );
    }
    assert!(assessment.total.satisfied, "total credits not satisfied");
    assert_eq!(assessment.total_credits.get(), 126);
    assert_eq!(assessment.total_credits_required, 124);
    assert!(assessment.graduatable, "expected graduatable");
    // No in-progress courses, so no tentative projection.
    assert!(assessment.tentative.is_none());
}

#[test]
fn missing_thesis_makes_current_not_graduatable_but_tentative_yes() {
    // Same transcript, but the thesis is still in progress.
    let mut courses = synthetic_passing_transcript();
    // Replace 卒業論文 with an in-progress version.
    for c in courses.iter_mut() {
        if c.name == "卒業論文" {
            *c = Arc::new(
                Course::of(CourseInput {
                    id: CourseId::of("thesis-inprogress").unwrap(),
                    name: "卒業論文".to_owned(),
                    credit: Credit::new(8),
                    grade: Grade::Risyuchu,
                    category: SubjectCategory::Seminar56Thesis,
                    raw_category_label: String::new(),
                    year: Some(2026),
                    teacher: None,
                    score: None,
                })
                .unwrap(),
            );
        }
    }
    let profile = StudentProfile::new("人文社会科学部", "人文科学コース", 2022).unwrap();
    let record = AcademicRecord::new(profile, courses);
    let assessment = assess(&record, &default::rule_set());

    assert!(
        !assessment.graduatable,
        "thesis in progress → not graduatable now"
    );
    let tentative = assessment.tentative.expect("tentative projection expected");
    assert!(
        tentative.graduatable,
        "if the thesis passes, the student graduates"
    );
    assert_eq!(assessment.in_progress_credits.get(), 8);
}
