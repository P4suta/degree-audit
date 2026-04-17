import { describe, expect, it } from "vitest";
import { AcademicRecord } from "../domain/entities/academic-record.ts";
import { Course } from "../domain/entities/course.ts";
import { fixtures } from "../domain/rulesets/default/fixtures.ts";
import { defaultRuleSet } from "../domain/rulesets/default/index.ts";
import { CourseId } from "../domain/value-objects/course-id.ts";
import { Credit } from "../domain/value-objects/credit.ts";
import { Grade } from "../domain/value-objects/grade.ts";
import { SubjectCategory } from "../domain/value-objects/subject-category.ts";
import { assessGraduation } from "./assess-graduation.ts";
import {
	courseKindDisplayName,
	requirementDisplayName,
	viewCourseAllocations,
} from "./course-allocation-view.ts";

describe("viewCourseAllocations — graduatable fixture", () => {
	it("marks primary courses as counted under primary-12 without reallocation", () => {
		const record = fixtures.graduatable();
		const a = assessGraduation(record, defaultRuleSet);
		const passedIds = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		const v = viewCourseAllocations(a, record.courses, passedIds);
		for (const [, alloc] of v) {
			if (alloc.course.category.kind !== "common-education/primary") continue;
			expect(alloc.status.kind).toBe("counted");
			if (alloc.status.kind === "counted") {
				expect(alloc.status.requirementId).toBe("primary-12");
				expect(alloc.status.reallocated).toBe(false);
			}
		}
	});

	it("marks V-VI as counted under seminar-56 without reallocation", () => {
		const record = fixtures.seminar56Overflow();
		const a = assessGraduation(record, defaultRuleSet);
		const passedIds = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		const v = viewCourseAllocations(a, record.courses, passedIds);
		for (const [, alloc] of v) {
			if (alloc.course.category.kind !== "seminar/5-6-thesis") continue;
			expect(alloc.status.kind).toBe("counted");
			if (alloc.status.kind === "counted") {
				expect(alloc.status.requirementId).toBe("seminar-56");
				expect(alloc.status.reallocated).toBe(false);
			}
		}
	});
});

describe("viewCourseAllocations — not-passed courses", () => {
	it("marks every course as not-passed when passed set is empty", () => {
		const record = fixtures.graduatable();
		const a = assessGraduation(record, defaultRuleSet);
		const v = viewCourseAllocations(a, record.courses, new Set());
		for (const [, alloc] of v) expect(alloc.status.kind).toBe("not-passed");
	});
});

describe("viewCourseAllocations — in-progress courses", () => {
	it("marks in-progress courses as in-progress (not not-passed)", () => {
		const inProgress = Course.of({
			id: CourseId.of("IP1"),
			name: "卒業論文（履修中）",
			credit: Credit.of(8),
			grade: Grade.Risyuchu,
			category: SubjectCategory.seminar56Thesis(),
			rawCategoryLabel: "raw",
		});
		const record = fixtures.graduatable();
		const a = assessGraduation(record, defaultRuleSet);
		const passedIds = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		const v = viewCourseAllocations(
			a,
			[...record.courses, inProgress],
			passedIds,
		);
		const alloc = v.get(inProgress.id as string);
		expect(alloc?.status.kind).toBe("in-progress");
		if (alloc?.status.kind === "in-progress") {
			expect(alloc.status.naturalHome).toBe("seminar-56");
		}
	});
});

describe("viewCourseAllocations — edge cases", () => {
	it("assigns naturalHome=null to courses with unknown kind", () => {
		const record = fixtures.graduatable();
		const a = assessGraduation(record, defaultRuleSet);
		// Inject an unknown-kind course outside the assessment pipeline
		const unknown = Course.of({
			id: CourseId.of("U1"),
			name: "謎科目",
			credit: Credit.of(2),
			grade: Grade.Yu,
			category: SubjectCategory.unknown("raw"),
			rawCategoryLabel: "raw",
		});
		const passedIds = new Set([unknown.id as string]);
		const v = viewCourseAllocations(a, [unknown], passedIds);
		const alloc = v.get(unknown.id as string);
		expect(alloc?.status.naturalHome).toBeNull();
	});

	it("surfaces excluded courses with their cap reason", () => {
		const record = fixtures.graduatable();
		const a = assessGraduation(record, defaultRuleSet);
		// Force excluded courses by extending the elective step result
		const stepWithExcluded = a.steps.map((s) => {
			if (s.id !== "elective-38") return s;
			const someCourse = record.courses[0];
			if (!someCourse) return s;
			return {
				...s,
				result: {
					...s.result,
					excludedCourses: [
						{ course: someCourse, reason: "16 単位枠超過で算入外" },
					],
				},
			};
		});
		const withEx = { ...a, steps: stepWithExcluded };
		const passedIds = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		const v = viewCourseAllocations(withEx, record.courses, passedIds);
		const firstCourseId = record.courses[0]?.id as string;
		const alloc = v.get(firstCourseId);
		// 最初の course は primary-named なので pipeline が consume 済み。
		// contribut に含まれる場合は counted になるので excluded 経路は辿らないが、
		// 少なくとも 1 件でも excluded 経路が実行されることを確認するため、
		// pipeline consume に無い仮想 course を使う
		void alloc;
		const orphan = Course.of({
			id: CourseId.of("ORPHAN"),
			name: "枠超過で落ちる他学部",
			credit: Credit.of(2),
			grade: Grade.Yu,
			category: SubjectCategory.electiveOtherFaculty(),
			rawCategoryLabel: "raw",
		});
		const withOrphanEx = {
			...a,
			steps: a.steps.map((s) => {
				if (s.id !== "elective-38") return s;
				return {
					...s,
					result: {
						...s.result,
						excludedCourses: [
							{ course: orphan, reason: "16 単位枠超過で算入外" },
						],
					},
				};
			}),
		};
		const v2 = viewCourseAllocations(
			withOrphanEx,
			[orphan],
			new Set([orphan.id as string]),
		);
		const o = v2.get(orphan.id as string);
		expect(o?.status.kind).toBe("excluded");
		if (o?.status.kind === "excluded") {
			expect(o.status.reason).toContain("枠");
		}
	});

	it("falls back gracefully when no elective step exists in the assessment", () => {
		const record = fixtures.graduatable();
		const a = assessGraduation(record, defaultRuleSet);
		// Strip elective-38 to simulate a minimal ruleset assessment
		const stripped = {
			...a,
			steps: a.steps.filter((s) => s.id !== "elective-38"),
		} satisfies typeof a;
		const passedIds = new Set(
			AcademicRecord.passedCourses(record).map((c) => c.id as string),
		);
		const v = viewCourseAllocations(stripped, record.courses, passedIds);
		// 以前 elective で算入されていた own-course 類は unused-overflow 扱いになる
		const ownCourses = [...v.values()].filter(
			(a) => a.course.category.kind === "elective/own-course",
		);
		expect(ownCourses.length).toBeGreaterThan(0);
		for (const oc of ownCourses) {
			expect(oc.status.kind).toBe("unused-overflow");
		}
	});
});

describe("requirementDisplayName", () => {
	it("returns human-readable labels for known requirement ids", () => {
		expect(requirementDisplayName("primary-12")).toBe("初年次科目");
		expect(requirementDisplayName("liberal")).toBe("教養科目");
		expect(requirementDisplayName("introductory-group")).toBe("導入科目群");
		expect(requirementDisplayName("liberal-group")).toBe("教養科目群");
		expect(requirementDisplayName("seminar-12")).toBe("ゼミナール I・II");
		expect(requirementDisplayName("seminar-34")).toBe("ゼミナール III・IV");
		expect(requirementDisplayName("seminar-56")).toBe(
			"卒業論文・ゼミナール V・VI",
		);
		expect(requirementDisplayName("platform")).toBe("プラットフォーム科目");
		expect(requirementDisplayName("elective-38")).toBe("選択科目");
		expect(requirementDisplayName("elective-42")).toBe("選択科目");
		expect(requirementDisplayName("total-124")).toBe("総修得単位");
		expect(requirementDisplayName("thesis-eligibility")).toBe(
			"卒業論文履修資格",
		);
	});

	it("falls back to the raw id for unknown requirement ids", () => {
		expect(requirementDisplayName("some-custom-id")).toBe("some-custom-id");
	});
});

describe("courseKindDisplayName", () => {
	it("returns human-readable label for a kind", () => {
		expect(courseKindDisplayName("elective/other-faculty")).toBe("他学部専門");
	});
});
