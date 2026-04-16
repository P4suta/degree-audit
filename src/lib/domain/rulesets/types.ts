import type { PipelineStep } from "../allocation/pipeline.ts";
import type { StudentProfile } from "../entities/student-profile.ts";
import type { Specification } from "../specifications/types.ts";
import type { SubjectCategory } from "../value-objects/subject-category.ts";

export interface CategoryLookup {
	readonly rawLabel: string;
	readonly courseName?: string;
}

export type CategoryMap = (input: CategoryLookup) => SubjectCategory;

export interface RuleSetMetadata {
	readonly id: string;
	readonly displayName: string;
	readonly sourceRevision: string;
	readonly applicableTo: (profile: StudentProfile) => boolean;
	readonly specificity: number;
}

export interface RuleSet {
	readonly metadata: RuleSetMetadata;
	readonly categoryMap: CategoryMap;
	readonly requirements: readonly PipelineStep[];
	readonly totalRequirement: Specification;
	readonly thesisEligibility: Specification;
	readonly totalCreditsRequired: number;
}
