import * as z from "zod";
import { DomainError } from "../errors/domain-error.ts";
import { ErrorCode } from "../errors/error-code.ts";
import { err, ok, type Result } from "../errors/result.ts";
import { sanitizeLine } from "../text/normalize.ts";

export interface StudentProfile {
	readonly facultyId: string;
	readonly courseId: string;
	readonly matriculationYear: number;
	readonly extras: Readonly<Record<string, string | number>>;
}

const MATRICULATION_LOWER_BOUND = 1900;
const MATRICULATION_UPPER_BOUND = 2100;
const MAX_FIELD_LENGTH = 100;
const MAX_EXTRA_KEY_LENGTH = 50;
const MAX_EXTRAS_COUNT = 16;

const sanitizedString = z
	.string()
	.transform((s) => sanitizeLine(s, MAX_FIELD_LENGTH))
	.pipe(z.string().min(1, "field must not be blank"));

const extraValue = z.union([
	z
		.string()
		.transform((s) => sanitizeLine(s, MAX_FIELD_LENGTH))
		.pipe(z.string().min(1)),
	z.number().refine((n) => Number.isFinite(n), "number must be finite"),
]);

const StudentProfileSchema = z
	.object({
		facultyId: sanitizedString,
		courseId: sanitizedString,
		matriculationYear: z
			.number()
			.int()
			.gte(MATRICULATION_LOWER_BOUND)
			.lte(MATRICULATION_UPPER_BOUND),
		extras: z
			.record(z.string().min(1).max(MAX_EXTRA_KEY_LENGTH), extraValue)
			.refine(
				(r) => Object.keys(r).length <= MAX_EXTRAS_COUNT,
				`extras must have at most ${MAX_EXTRAS_COUNT} entries`,
			)
			.optional(),
	})
	.strict();

export const StudentProfile = {
	parse: (input: unknown): Result<StudentProfile> => {
		const result = StudentProfileSchema.safeParse(input);
		if (!result.success) {
			return err(
				new DomainError({
					code: ErrorCode.StudentProfileInvalid,
					message: "StudentProfile validation failed",
					userMessage: "学生プロフィールの入力に誤りがあります。",
					context: { issues: result.error.issues },
				}),
			);
		}
		const { facultyId, courseId, matriculationYear, extras } = result.data;
		return ok({
			facultyId,
			courseId,
			matriculationYear,
			extras: Object.freeze({ ...(extras ?? {}) }),
		});
	},
} as const;
