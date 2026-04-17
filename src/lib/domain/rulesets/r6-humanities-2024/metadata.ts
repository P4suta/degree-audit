import { matchKey } from "../../text/normalize.ts";
import type { RuleSetMetadata } from "../types.ts";

/**
 * 令和 6 年度（2024 年度）以降入学の 人文社会科学部 人文科学コース に適用。
 *
 * `applicableTo` は年度と courseId の両方を見る：
 *   - matriculationYear >= 2024（令和 6 年度以降）
 *   - courseId に "人文" を含む（"人文科学コース" / "人文科学" / "人文社会"
 *     いずれの表記揺れも拾う）
 *
 * specificity は 110 に設定。R2-R5 用 defaultRuleSet（100）と年度で分かれるため
 * 衝突しないが、将来同じ年度帯で複数ルールを持つ可能性があるので R2-R5 より
 * 明示的に高く。
 */
const MATRICULATION_MIN = 2024;
const HUMANITIES_COURSE_KEY = matchKey("人文");

export const metadata: RuleSetMetadata = {
	id: "kochi-university/2024-humanities",
	displayName: "高知大学 令和 6 年度（2024 年度）以降入学生・人文科学コース",
	sourceRevision: "履修案内 2026-04 抜粋（R6 人文科学コース）",
	applicableTo: (profile) => {
		if (profile.matriculationYear < MATRICULATION_MIN) return false;
		return matchKey(profile.courseId).includes(HUMANITIES_COURSE_KEY);
	},
	specificity: 110,
};
