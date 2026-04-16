import type { RuleSetMetadata } from "../types.ts";

const MATRICULATION_MIN = 2020;
const MATRICULATION_MAX = 2023;

export const metadata: RuleSetMetadata = {
	id: "kochi-university/2020-2023",
	displayName: "高知大学 令和2〜5年度（2020〜2023年度）入学生",
	sourceRevision: "履修案内 2026-04 抜粋",
	applicableTo: (profile) =>
		profile.matriculationYear >= MATRICULATION_MIN &&
		profile.matriculationYear <= MATRICULATION_MAX,
	specificity: 100,
};
