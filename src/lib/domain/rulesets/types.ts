import type { PipelineStep } from "../allocation/pipeline.ts";
import type { StudentProfile } from "../entities/student-profile.ts";
import type { Specification } from "../specifications/types.ts";
import type { SubjectCategory } from "../value-objects/subject-category.ts";

export interface CategoryLookup {
	readonly rawLabel: string;
	readonly courseName?: string;
}

export type CategoryMap = (input: CategoryLookup) => SubjectCategory;

/**
 * 学部 > コース の階層組。`applicableScopes` の各要素。
 * UI は学部を先に選ばせ、選ばれた学部に属するコースだけを次の Select に
 * 出すことで「コースから入力」できないようにする。
 */
export interface RuleSetScope {
	readonly faculty: string;
	readonly course: string;
}

export interface RuleSetMetadata {
	readonly id: string;
	readonly displayName: string;
	readonly sourceRevision: string;
	readonly applicableTo: (profile: StudentProfile) => boolean;
	readonly specificity: number;
	/**
	 * この ruleset が想定している (学部, コース) の組み合わせ。UI のカスケード
	 * Select 用に明示的な階層で持つ（学部を選ぶとコース候補が絞られる）。
	 *
	 * applicableTo の述語とは独立：UI の列挙ヒント専用で、validation は
	 * 行わない（resolveRuleSet は従来どおり `applicableTo` で判定）。
	 * 省略時は UI が自由入力にフォールバックしてもよい。
	 */
	readonly applicableScopes?: readonly RuleSetScope[];
}

export interface RuleSet {
	readonly metadata: RuleSetMetadata;
	readonly categoryMap: CategoryMap;
	readonly requirements: readonly PipelineStep[];
	readonly totalRequirement: Specification;
	readonly thesisEligibility: Specification;
	readonly totalCreditsRequired: number;
}
