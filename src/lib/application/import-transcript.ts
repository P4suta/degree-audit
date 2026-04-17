import { AcademicRecord } from "../domain/entities/academic-record.ts";
import type { StudentProfile } from "../domain/entities/student-profile.ts";
import { DomainError } from "../domain/errors/domain-error.ts";
import { ErrorCode } from "../domain/errors/error-code.ts";
import { err, flatMap, ok, type Result } from "../domain/errors/result.ts";
import type { RuleSet } from "../domain/rulesets/types.ts";
import {
	type MappingFailure,
	mapRawCoursesToCourses,
} from "../infrastructure/mappers/raw-to-course.ts";
import type { TranscriptParser } from "../infrastructure/parsers/transcript-parser.ts";

export interface ImportInput {
	readonly source: Uint8Array;
	readonly parser: TranscriptParser;
	readonly ruleSet: RuleSet;
	readonly profile: StudentProfile;
}

export interface ImportOutcome {
	readonly record: AcademicRecord;
	readonly skipped: readonly MappingFailure[];
	readonly unknownCategoryCount: number;
}

/**
 * 区分未判定（SubjectCategory.unknown）の比率がこれ以上なら取り込みを拒否する。
 * 1.0 の時点では「すべてが unknown」だけを弾く。閾値を下げれば中間的な怪しい
 * ケースも弾ける。
 */
const UNKNOWN_CATEGORY_REJECTION_THRESHOLD = 1.0;

const assertRecognisableCategories = (
	outcome: ImportOutcome,
): Result<ImportOutcome, DomainError> => {
	const total = outcome.record.courses.length;
	if (total === 0) return ok(outcome);
	const ratio = outcome.unknownCategoryCount / total;
	if (ratio >= UNKNOWN_CATEGORY_REJECTION_THRESHOLD) {
		return err(
			new DomainError({
				code: ErrorCode.ImportAllCategoriesUnknown,
				message: `All ${total} parsed courses fell into the 'unknown' category`,
				userMessage:
					"取り込んだ科目の区分がひとつも認識できませんでした。別学部の MHTML が混入していないか、ファイルが壊れていないか確認してください。",
				context: { total, unknown: outcome.unknownCategoryCount },
			}),
		);
	}
	return ok(outcome);
};

export const importTranscript = async (
	input: ImportInput,
): Promise<Result<ImportOutcome, DomainError>> => {
	const parseResult = await input.parser.parse(input.source);
	const built = flatMap(
		parseResult,
		(raws): Result<ImportOutcome, DomainError> => {
			const { courses, skipped } = mapRawCoursesToCourses(
				raws,
				input.ruleSet.categoryMap,
			);
			const unknownCategoryCount = courses.filter(
				(c) => c.category.kind === "unknown",
			).length;
			return ok({
				record: AcademicRecord.of(input.profile, courses),
				skipped,
				unknownCategoryCount,
			});
		},
	);
	return flatMap(built, assertRecognisableCategories);
};
