import { describe, expect, it } from "vitest";
import { ErrorCode } from "../errors/error-code.ts";
import { hasCode } from "../errors/guards.ts";
import { CourseId } from "../value-objects/course-id.ts";
import { Credit } from "../value-objects/credit.ts";
import { Grade } from "../value-objects/grade.ts";
import { SubjectCategory } from "../value-objects/subject-category.ts";
import { Course } from "./course.ts";

const baseInput = () => ({
	id: CourseId.of("K81001"),
	name: "大学基礎論",
	credit: Credit.of(2),
	grade: Grade.Yu,
	category: SubjectCategory.primary(),
	rawCategoryLabel: "共通教育科目 初年次科目",
});

describe("Course.of", () => {
	it("constructs a Course from required fields", () => {
		const course = Course.of(baseInput());
		expect(course).toEqual({
			id: CourseId.of("K81001"),
			name: "大学基礎論",
			credit: Credit.of(2),
			grade: Grade.Yu,
			category: SubjectCategory.primary(),
			rawCategoryLabel: "共通教育科目 初年次科目",
		});
		expect("year" in course).toBe(false);
		expect("teacher" in course).toBe(false);
		expect("score" in course).toBe(false);
	});

	it("trims course name whitespace", () => {
		const course = Course.of({ ...baseInput(), name: "  科目名  " });
		expect(course.name).toBe("科目名");
	});

	it("rejects empty / whitespace-only names with CourseInvalidName", () => {
		for (const bad of ["", "   "]) {
			try {
				Course.of({ ...baseInput(), name: bad });
				expect.unreachable("should have thrown");
			} catch (e) {
				expect(hasCode(e, ErrorCode.CourseInvalidName)).toBe(true);
			}
		}
	});

	it("attaches year / teacher / score only when provided", () => {
		const course = Course.of({
			...baseInput(),
			year: 2023,
			teacher: "山田 太郎",
			score: 87,
		});
		expect(course.year).toBe(2023);
		expect(course.teacher).toBe("山田 太郎");
		expect(course.score).toBe(87);
	});
});
