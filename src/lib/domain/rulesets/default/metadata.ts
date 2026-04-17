import type { RuleSetMetadata } from "../types.ts";

const MATRICULATION_MIN = 2020;
const MATRICULATION_MAX = 2023;

export const metadata: RuleSetMetadata = {
	id: "humanities/2020-2023",
	displayName: "令和 2〜5 年度（2020〜2023 年度）入学生（人文科学コース）",
	sourceRevision: "履修案内 2026-04 抜粋",
	applicableTo: (profile) =>
		profile.matriculationYear >= MATRICULATION_MIN &&
		profile.matriculationYear <= MATRICULATION_MAX,
	specificity: 100,
	// UI の列挙ヒント。applicableTo は courseId/facultyId を見ていないが、
	// 対象スコープは 人文社会科学部・人文科学コース のみ（DESIGN.md / 免責に準拠）。
	applicableScopes: [{ faculty: "人文社会科学部", course: "人文科学コース" }],
};
