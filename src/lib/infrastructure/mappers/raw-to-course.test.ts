import { describe, expect, it } from "vitest";
import { defaultCategoryMap } from "../../domain/rulesets/default/category-map.ts";
import { Credit } from "../../domain/value-objects/credit.ts";
import { Grade } from "../../domain/value-objects/grade.ts";
import type { RawCourse } from "../parsers/transcript-parser.ts";
import { mapRawCoursesToCourses } from "./raw-to-course.ts";

const raw = (overrides: Partial<RawCourse> = {}): RawCourse => ({
	rawCategoryLabel: "共通教育 初年次",
	name: "大学基礎論",
	creditText: "2",
	gradeText: "優",
	...overrides,
});

describe("mapRawCoursesToCourses", () => {
	it("maps a valid RawCourse into a Course", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ courseCode: "K81001", yearText: "2023", scoreText: "85" })],
			defaultCategoryMap,
		);
		expect(outcome.courses).toHaveLength(1);
		expect(outcome.skipped).toHaveLength(0);
		const course = outcome.courses[0];
		expect(course?.name).toBe("大学基礎論");
		expect(course?.grade).toBe(Grade.Yu);
		expect(Credit.toNumber(course?.credit as Credit)).toBe(2);
		expect(course?.year).toBe(2023);
		expect(course?.score).toBe(85);
		expect(course?.category.kind).toBe("common-education/primary");
	});

	it("skips courses with unparseable credit values", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ creditText: "N/A" })],
			defaultCategoryMap,
		);
		expect(outcome.courses).toHaveLength(0);
		expect(outcome.skipped).toHaveLength(1);
	});

	it("assigns anonymous ids when courseCode is missing", () => {
		const outcome = mapRawCoursesToCourses([raw(), raw()], defaultCategoryMap);
		expect(outcome.courses).toHaveLength(2);
		expect(outcome.courses[0]?.id).not.toBe(outcome.courses[1]?.id);
	});

	it("falls back to Grade.Unknown for unknown grade strings", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ gradeText: "???" })],
			defaultCategoryMap,
		);
		expect(outcome.courses[0]?.grade).toBe(Grade.Unknown);
	});

	it("skips year / score fields that fail numeric parsing", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ yearText: "最近", scoreText: "不明" })],
			defaultCategoryMap,
		);
		expect(outcome.courses[0]?.year).toBeUndefined();
		expect(outcome.courses[0]?.score).toBeUndefined();
	});

	it("captures unexpected errors (non-DomainError) as skipped", () => {
		const throwingMap = () => {
			throw new Error("synthetic");
		};
		const outcome = mapRawCoursesToCourses([raw()], throwingMap);
		expect(outcome.skipped).toHaveLength(1);
	});

	it("preserves teacher when present", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ teacher: "山田" })],
			defaultCategoryMap,
		);
		expect(outcome.courses[0]?.teacher).toBe("山田");
	});

	it("rejects 5-digit years outside the allowed range", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ yearText: "9999" })],
			defaultCategoryMap,
		);
		expect(outcome.courses[0]?.year).toBeUndefined();
	});

	it("treats multi-dot credit input as unparseable", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ creditText: "1.2.3" })],
			defaultCategoryMap,
		);
		expect(outcome.courses).toHaveLength(0);
		expect(outcome.skipped).toHaveLength(1);
	});

	it("treats multi-dot score input as unparseable", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ scoreText: "9.9.9" })],
			defaultCategoryMap,
		);
		expect(outcome.courses[0]?.score).toBeUndefined();
	});

	it("rejects scores above 100", () => {
		const outcome = mapRawCoursesToCourses(
			[raw({ scoreText: "150" })],
			defaultCategoryMap,
		);
		expect(outcome.courses[0]?.score).toBeUndefined();
	});
});
