import { describe, expect, it } from "vitest";
import { assessGraduation } from "../../../application/assess-graduation.ts";
import { AcademicRecord } from "../../entities/academic-record.ts";
import { Course } from "../../entities/course.ts";
import { StudentProfile } from "../../entities/student-profile.ts";
import { isOk } from "../../errors/result.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { FieldCategory } from "../../value-objects/field-category.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import { fixtures } from "./fixtures.ts";
import { defaultRuleSet } from "./index.ts";

/**
 * 判定エンジンの仕様を代表ケースで回帰スイート化する。ルールセット変更時の
 * 退行を検出するのが目的。baseline（= graduatable fixture）に対する diff を
 * ケース単位で記述する。
 */

const profile = (() => {
	const r = StudentProfile.parse({
		facultyId: "humanities",
		courseId: "philosophy",
		matriculationYear: 2022,
	});
	if (!isOk(r)) throw new Error("profile");
	return r.value;
})();

let counter = 10_000;
const mk = (credit: number, category: SubjectCategory, name?: string) => {
	counter += 1;
	const id = `D${counter.toString().padStart(5, "0")}`;
	return Course.of({
		id: CourseId.of(id),
		name: name ?? `科目${id}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category,
		rawCategoryLabel: "raw",
	});
};

const deriveFrom = (
	source: AcademicRecord,
	transform: (courses: readonly Course[]) => readonly Course[],
): AcademicRecord => AcademicRecord.of(profile, transform(source.courses));

const assess = (record: AcademicRecord) =>
	assessGraduation(record, defaultRuleSet);

describe("decision-table — baseline graduatable", () => {
	it("passes every top-level requirement and thesis eligibility", () => {
		const a = assess(fixtures.graduatable());
		expect(a.graduatable).toBe(true);
		expect(a.thesisEligibility.satisfied).toBe(true);
		expect(a.total.satisfied).toBe(true);
		expect(a.steps.map((s) => s.result.satisfied)).toEqual(
			Array(a.steps.length).fill(true),
		);
	});
});

describe("decision-table — English alone does not satisfy foreign-language", () => {
	it("fails liberal when all foreign-language credits are 英語", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs.filter(
				(c) => c.category.kind !== "common-education/liberal/foreign-language",
			),
			mk(2, SubjectCategory.liberalForeignLanguage("英語")),
			mk(2, SubjectCategory.liberalForeignLanguage("英語")),
			mk(2, SubjectCategory.liberalForeignLanguage("英語")),
			mk(2, SubjectCategory.liberalForeignLanguage("英語")),
		]);
		const a = assess(record);
		expect(a.graduatable).toBe(false);
		const liberal = a.steps.find((s) => s.id === "liberal");
		expect(liberal?.result.satisfied).toBe(false);
	});
});

describe("decision-table — seminar V-VI excess does not leak into elective", () => {
	it("keeps V-VI courses out of the elective pool even beyond the 8 requirement", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs,
			mk(2, SubjectCategory.seminar56Thesis()),
			mk(2, SubjectCategory.seminar56Thesis()),
		]);
		const a = assess(record);
		const elective = a.steps.find((s) => s.id === "elective-38");
		const hasVVI = elective?.result.contributingCourses.some(
			(c) => c.category.kind === "seminar/5-6-thesis",
		);
		expect(hasVVI).toBe(false);
	});
});

describe("decision-table — 演習 I 4 / 演習 II 0 fails seminar-34", () => {
	it("fails seminar-34 when total 4 is reached but 演習 II is missing", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs.filter(
				(c) =>
					c.category.kind !== "seminar/3-4/spring" &&
					c.category.kind !== "seminar/3-4/fall",
			),
			mk(2, SubjectCategory.seminar34Spring()),
			mk(2, SubjectCategory.seminar34Spring()),
		]);
		const a = assess(record);
		const seminar34 = a.steps.find((s) => s.id === "seminar-34");
		expect(seminar34?.result.satisfied).toBe(false);
	});
});

describe("decision-table — 大学基礎論 missing fails primary-12", () => {
	it("fails primary-12 even if other 5 subjects + a duplicate reach 12 credits", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs.filter((c) => c.category.kind !== "common-education/primary"),
			mk(2, SubjectCategory.primary(), "大学英語入門I"),
			mk(2, SubjectCategory.primary(), "英会話I"),
			mk(2, SubjectCategory.primary(), "情報処理"),
			mk(2, SubjectCategory.primary(), "学問基礎論"),
			mk(2, SubjectCategory.primary(), "課題探求実践セミナー"),
			mk(2, SubjectCategory.primary(), "課題探求実践セミナー"),
		]);
		const a = assess(record);
		const primary = a.steps.find((s) => s.id === "primary-12");
		expect(primary?.result.satisfied).toBe(false);
	});
});

describe("decision-table — sports cap 4", () => {
	it("caps sports-science to 4 credits when counting toward liberal 28", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs,
			mk(
				2,
				SubjectCategory.liberalField(FieldCategory.BioMedical),
				"スポーツ科学講義",
			),
			mk(
				2,
				SubjectCategory.liberalField(FieldCategory.BioMedical),
				"スポーツ科学実技",
			),
			mk(
				2,
				SubjectCategory.liberalField(FieldCategory.BioMedical),
				"スポーツ科学実技",
			),
		]);
		const a = assess(record);
		const liberal = a.steps.find((s) => s.id === "liberal");
		// liberal 28 は baseline で満たされている。sports を 6 単位足しても、
		// predicate cap により 4 単位までしか追加算入されない。
		expect(
			liberal?.result.diagnostics.some(
				(d) => d.includes("スポーツ科学") && d.includes("卒業要件外"),
			) ||
				liberal?.result.subResults.some((sr) =>
					sr.diagnostics.some(
						(d) => d.includes("スポーツ科学") && d.includes("卒業要件外"),
					),
				),
		).toBe(true);
	});
});

describe("decision-table — other-faculty 12 units: 8 counted, 4 rejected", () => {
	it("reports otherFaculty cap exceedance in elective diagnostics", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs.filter((c) => c.category.kind !== "elective/own-course").slice(),
			...Array.from({ length: 6 }, () =>
				mk(2, SubjectCategory.electiveOtherFaculty()),
			),
			...Array.from({ length: 13 }, () =>
				mk(2, SubjectCategory.electiveOwnCourse()),
			),
		]);
		const a = assess(record);
		const elective = a.steps.find((s) => s.id === "elective-38");
		expect(
			elective?.result.diagnostics.some((d) => d.includes("他学部上限超過")),
		).toBe(true);
	});
});

describe("decision-table — 16-unit frame cap: other-course + other-faculty overflow", () => {
	it("rejects the excess over 16 combined other-course/faculty + PF overflow", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs.filter((c) => c.category.kind !== "elective/own-course"),
			// 他学部 8 + 他コース 14 = 22, frame cap 16 → 6 rejected
			...Array.from({ length: 4 }, () =>
				mk(2, SubjectCategory.electiveOtherFaculty()),
			),
			...Array.from({ length: 7 }, () =>
				mk(2, SubjectCategory.electiveOtherCourse()),
			),
			...Array.from({ length: 10 }, () =>
				mk(2, SubjectCategory.electiveOwnCourse()),
			),
		]);
		const a = assess(record);
		const elective = a.steps.find((s) => s.id === "elective-38");
		expect(elective?.result.diagnostics.some((d) => d.includes("枠超過"))).toBe(
			true,
		);
	});
});

describe("decision-table — unknown kind does not contribute to elective", () => {
	it("ignores unknown kind leftover at the elective allowedKinds filter", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			// 自コース 19 を 10 単位 (5 courses) まで減らし、unknown 10 単位足しても
			// 選択 38 は 10 < 38 で不足
			...cs.filter((c) => c.category.kind !== "elective/own-course"),
			...Array.from({ length: 5 }, () =>
				mk(2, SubjectCategory.electiveOwnCourse()),
			),
			...Array.from({ length: 5 }, () =>
				mk(2, SubjectCategory.unknown("未分類")),
			),
		]);
		const a = assess(record);
		const elective = a.steps.find((s) => s.id === "elective-38");
		expect(elective?.result.satisfied).toBe(false);
		const hasUnknown = elective?.result.contributingCourses.some(
			(c) => c.category.kind === "unknown",
		);
		expect(hasUnknown).toBe(false);
	});
});

describe("decision-table — thesis eligibility fails when seminar I-II short", () => {
	it("reports thesis unavailable when seminar I・II < 4", () => {
		counter = 10_000;
		const record = deriveFrom(fixtures.graduatable(), (cs) => [
			...cs.filter((c) => c.category.kind !== "seminar/1-2"),
			mk(2, SubjectCategory.seminar12()),
		]);
		const a = assess(record);
		expect(a.thesisEligibility.satisfied).toBe(false);
	});
});
