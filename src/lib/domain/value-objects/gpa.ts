import { DomainError } from "../errors/domain-error.ts";
import { ErrorCode } from "../errors/error-code.ts";
import { Credit } from "./credit.ts";

declare const GradePointBrand: unique symbol;
declare const GpaBrand: unique symbol;

export type GradePoint = number & {
	readonly [GradePointBrand]: "GradePoint";
};

export type GPA = number & { readonly [GpaBrand]: "GPA" };

const brandGradePoint = (n: number): GradePoint => n as GradePoint;
const brandGpa = (n: number): GPA => n as GPA;

const roundTo1Decimal = (n: number): number => Math.round(n * 10) / 10;

export const GradePoint = {
	zero: brandGradePoint(0),
	/**
	 * Kochi University functional GPA formula:
	 *   score >= 60 → GP = (score - 55) / 10   (60→0.5, 70→1.5, 80→2.5, 90→3.5, 100→4.5)
	 *   score <= 59 → GP = 0
	 * Rounded to 1 decimal place.
	 */
	ofScore: (score: number): GradePoint => {
		if (!Number.isFinite(score) || score < 0 || score > 100) {
			throw new DomainError({
				code: ErrorCode.GpaInvalidScore,
				message: `Score must be a finite number in [0, 100]; received ${score}`,
				userMessage: "成績評点は 0〜100 の数値で指定してください。",
				context: { score },
			});
		}
		if (score <= 59) return brandGradePoint(0);
		return brandGradePoint(roundTo1Decimal((score - 55) / 10));
	},
	toNumber: (gp: GradePoint): number => gp,
} as const;

export interface GpaEntry {
	readonly gradePoint: GradePoint;
	readonly credit: Credit;
}

export const GPA = {
	/**
	 * Weighted average of GradePoints by credits, rounded to 1 decimal place.
	 * Returns 0 when the total credit is zero.
	 */
	weightedAverage: (entries: readonly GpaEntry[]): GPA => {
		let sumGpCredit = 0;
		let sumCredit = 0;
		for (const entry of entries) {
			const c = Credit.toNumber(entry.credit);
			sumGpCredit += GradePoint.toNumber(entry.gradePoint) * c;
			sumCredit += c;
		}
		if (sumCredit === 0) return brandGpa(0);
		return brandGpa(roundTo1Decimal(sumGpCredit / sumCredit));
	},
	toNumber: (gpa: GPA): number => gpa,
} as const;
