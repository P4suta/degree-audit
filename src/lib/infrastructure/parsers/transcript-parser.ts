import type { DomainError } from "../../domain/errors/domain-error.ts";
import type { Result } from "../../domain/errors/result.ts";

export interface RawCourse {
	readonly rawCategoryLabel: string;
	readonly name: string;
	readonly creditText: string;
	readonly gradeText: string;
	readonly yearText?: string;
	readonly teacher?: string;
	readonly scoreText?: string;
	readonly courseCode?: string;
}

export interface TranscriptParser {
	parse(source: string): Result<readonly RawCourse[], DomainError>;
}
