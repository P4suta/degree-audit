import type { RuleSet } from "../types.ts";
import { defaultCategoryMap } from "./category-map.ts";
import { metadata } from "./metadata.ts";
import {
	requirements,
	thesisEligibility,
	totalRequirement,
} from "./requirements.ts";

export const defaultRuleSet: RuleSet = {
	metadata,
	categoryMap: defaultCategoryMap,
	requirements,
	totalRequirement,
	thesisEligibility,
	totalCreditsRequired: 124,
};
