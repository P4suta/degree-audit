import { DomainError } from "../errors/domain-error.ts";
import { ErrorCode } from "../errors/error-code.ts";

declare const CourseIdBrand: unique symbol;

export type CourseId = string & { readonly [CourseIdBrand]: "CourseId" };

const brand = (value: string): CourseId => value as CourseId;

export const CourseId = {
	of: (value: string): CourseId => {
		const trimmed = value.trim();
		if (trimmed === "") {
			throw new DomainError({
				code: ErrorCode.CourseIdEmpty,
				message: "CourseId must not be empty",
				userMessage: "科目 ID が空です。",
				context: { value },
			});
		}
		return brand(trimmed);
	},
	toString: (id: CourseId): string => id,
} as const;
