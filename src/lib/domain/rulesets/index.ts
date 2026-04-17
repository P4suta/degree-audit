import { defaultRuleSet } from "./default/index.ts";
import { r6HumanitiesRuleSet } from "./r6-humanities-2024/index.ts";
import { createRegistry, type Registry } from "./registry.ts";

export const defaultRegistry: Registry = createRegistry([
	defaultRuleSet,
	r6HumanitiesRuleSet,
]);
