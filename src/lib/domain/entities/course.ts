import { DomainError } from "../errors/domain-error.ts";
import { ErrorCode } from "../errors/error-code.ts";
import type { CourseId } from "../value-objects/course-id.ts";
import type { Credit } from "../value-objects/credit.ts";
import type { Grade } from "../value-objects/grade.ts";
import type { SubjectCategory } from "../value-objects/subject-category.ts";

export interface Course {
	readonly id: CourseId;
	readonly name: string;
	readonly credit: Credit;
	readonly grade: Grade;
	readonly category: SubjectCategory;
	readonly rawCategoryLabel: string;
	readonly year?: number;
	readonly teacher?: string;
	readonly score?: number;
}

export interface CourseInput {
	readonly id: CourseId;
	readonly name: string;
	readonly credit: Credit;
	readonly grade: Grade;
	readonly category: SubjectCategory;
	readonly rawCategoryLabel: string;
	readonly year?: number;
	readonly teacher?: string;
	readonly score?: number;
}

const assertValidName = (name: string): string => {
	const trimmed = name.trim();
	if (trimmed === "") {
		throw new DomainError({
			code: ErrorCode.CourseInvalidName,
			message: "Course name must not be empty",
			userMessage: "科目名が空です。",
			context: { name },
		});
	}
	return trimmed;
};

export const Course = {
	of: (input: CourseInput): Course => {
		const base = {
			id: input.id,
			name: assertValidName(input.name),
			credit: input.credit,
			grade: input.grade,
			category: input.category,
			rawCategoryLabel: input.rawCategoryLabel,
		};
		return {
			...base,
			...(input.year !== undefined ? { year: input.year } : {}),
			...(input.teacher !== undefined ? { teacher: input.teacher } : {}),
			...(input.score !== undefined ? { score: input.score } : {}),
		};
	},
} as const;
