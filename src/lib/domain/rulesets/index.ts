import { defaultRuleSet } from "./default/index.ts";
import { createRegistry, type Registry } from "./registry.ts";

export const defaultRegistry: Registry = createRegistry([defaultRuleSet]);
