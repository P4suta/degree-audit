import type { RuleSet } from "../types.ts";
import { r6CategoryMap } from "./category-map.ts";
import { metadata } from "./metadata.ts";
import {
	requirements,
	thesisEligibility,
	totalRequirement,
} from "./requirements.ts";

export const r6HumanitiesRuleSet: RuleSet = {
	metadata,
	categoryMap: r6CategoryMap,
	requirements,
	totalRequirement,
	thesisEligibility,
	totalCreditsRequired: 124,
};
