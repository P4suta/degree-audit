import type { Course } from "../../domain/entities/course.ts";
import { Course as CourseNS } from "../../domain/entities/course.ts";
import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import type { CategoryMap } from "../../domain/rulesets/types.ts";
import { CourseId } from "../../domain/value-objects/course-id.ts";
import { Credit } from "../../domain/value-objects/credit.ts";
import { parseGrade } from "../../domain/value-objects/grade.ts";
import type { RawCourse } from "../parsers/transcript-parser.ts";

export interface MappingFailure {
	readonly raw: RawCourse;
	readonly error: DomainError;
}

export interface MappingOutcome {
	readonly courses: readonly Course[];
	readonly skipped: readonly MappingFailure[];
}

const parseCredit = (text: string): number | undefined => {
	const cleaned = text.replace(/[^0-9.]/g, "");
	if (cleaned === "") return undefined;
	const value = Number(cleaned);
	if (!Number.isFinite(value)) return undefined;
	return value;
};

const parseYear = (text: string): number | undefined => {
	const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
	if (cleaned === "") return undefined;
	const value = Number(cleaned);
	if (!Number.isInteger(value) || value < 1900 || value > 2100)
		return undefined;
	return value;
};

const parseScore = (text: string): number | undefined => {
	const cleaned = text.replace(/[^0-9.]/g, "");
	if (cleaned === "") return undefined;
	const value = Number(cleaned);
	if (!Number.isFinite(value)) return undefined;
	if (value > 100) return undefined;
	return value;
};

let anonymousCounter = 0;
const nextAnonymousId = (): string => {
	anonymousCounter += 1;
	return `anonymous-${anonymousCounter.toString().padStart(6, "0")}`;
};

/**
 * Derives a stable but unique Course id from the raw fields.
 *
 * - courseCode is the natural key when the MHTML provides it, but the same code
 *   can legitimately appear multiple times for retakes or multi-semester
 *   offerings. We suffix it with yearText (when available) to distinguish
 *   those rows; if that still collides we further disambiguate with a running
 *   counter so downstream uniqueById operations don't silently merge distinct
 *   courses.
 * - Without a courseCode we fall back to a fresh anonymous id per row.
 */
const assignStableId = (raw: RawCourse, taken: Set<string>): string => {
	if (raw.courseCode === undefined) return nextAnonymousId();
	const baseWithYear =
		raw.yearText !== undefined && raw.yearText !== ""
			? `${raw.courseCode}::${raw.yearText}`
			: raw.courseCode;
	if (!taken.has(baseWithYear)) return baseWithYear;
	let suffix = 2;
	let candidate = `${baseWithYear}::${suffix}`;
	while (taken.has(candidate)) {
		suffix += 1;
		candidate = `${baseWithYear}::${suffix}`;
	}
	return candidate;
};

export const mapRawCoursesToCourses = (
	raws: readonly RawCourse[],
	categoryMap: CategoryMap,
): MappingOutcome => {
	const courses: Course[] = [];
	const skipped: MappingFailure[] = [];
	const takenIds = new Set<string>();
	for (const raw of raws) {
		try {
			const creditValue = parseCredit(raw.creditText);
			if (creditValue === undefined) {
				throw new DomainError({
					code: ErrorCode.RawCourseMappingFailed,
					message: `Unable to parse credit '${raw.creditText}' for course '${raw.name}'`,
					userMessage: `科目「${raw.name}」の単位数を解釈できません。`,
					context: { raw },
				});
			}
			const idSource = assignStableId(raw, takenIds);
			takenIds.add(idSource);
			const year =
				raw.yearText !== undefined ? parseYear(raw.yearText) : undefined;
			const score =
				raw.scoreText !== undefined ? parseScore(raw.scoreText) : undefined;
			const course = CourseNS.of({
				id: CourseId.of(idSource),
				name: raw.name,
				credit: Credit.of(creditValue),
				grade: parseGrade(raw.gradeText),
				category: categoryMap({
					rawLabel: raw.rawCategoryLabel,
					courseName: raw.name,
				}),
				rawCategoryLabel: raw.rawCategoryLabel,
				...(year !== undefined ? { year } : {}),
				...(raw.teacher !== undefined ? { teacher: raw.teacher } : {}),
				...(score !== undefined ? { score } : {}),
			});
			courses.push(course);
		} catch (cause) {
			const error =
				cause instanceof DomainError
					? cause
					: new DomainError({
							code: ErrorCode.RawCourseMappingFailed,
							message: `Unexpected error while mapping course '${raw.name}'`,
							userMessage: `科目「${raw.name}」の変換で予期せぬエラーが発生しました。`,
							context: { raw },
							cause,
						});
			skipped.push({ raw, error });
		}
	}
	return { courses, skipped };
};
