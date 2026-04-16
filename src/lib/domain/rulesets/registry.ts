import type { StudentProfile } from "../entities/student-profile.ts";
import { DomainError } from "../errors/domain-error.ts";
import { ErrorCode } from "../errors/error-code.ts";
import { err, ok, type Result } from "../errors/result.ts";
import type { RuleSet } from "./types.ts";

export interface Registry {
	readonly ruleSets: readonly RuleSet[];
	resolve(profile: StudentProfile): Result<RuleSet>;
}

export const createRegistry = (ruleSets: readonly RuleSet[]): Registry => ({
	ruleSets,
	resolve: (profile: StudentProfile): Result<RuleSet> => {
		const matching = ruleSets.filter((rs) => rs.metadata.applicableTo(profile));
		if (matching.length === 0) {
			return err(
				new DomainError({
					code: ErrorCode.RuleSetNotFound,
					message: "No rule set applies to the given profile",
					userMessage: "適用できる卒業要件ルールが見つかりませんでした。",
					context: { profile },
				}),
			);
		}
		const maxSpecificity = Math.max(
			...matching.map((rs) => rs.metadata.specificity),
		);
		const winners = matching.filter(
			(rs) => rs.metadata.specificity === maxSpecificity,
		);
		const winner = winners[0];
		if (winner === undefined || winners.length > 1) {
			return err(
				new DomainError({
					code: ErrorCode.RuleSetAmbiguous,
					message: "Multiple rule sets tied at the same specificity",
					userMessage: "同等の優先度で複数の卒業要件ルールが該当しました。",
					context: {
						profile,
						candidates: winners.map((rs) => rs.metadata.id),
					},
				}),
			);
		}
		return ok(winner);
	},
});
