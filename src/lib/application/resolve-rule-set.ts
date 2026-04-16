import type { StudentProfile } from "../domain/entities/student-profile.ts";
import type { DomainError } from "../domain/errors/domain-error.ts";
import type { Result } from "../domain/errors/result.ts";
import type { Registry } from "../domain/rulesets/registry.ts";
import type { RuleSet } from "../domain/rulesets/types.ts";

export const resolveRuleSet = (
	profile: StudentProfile,
	registry: Registry,
): Result<RuleSet, DomainError> => registry.resolve(profile);
