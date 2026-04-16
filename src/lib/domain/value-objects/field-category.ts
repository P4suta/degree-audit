export const FieldCategory = {
	Humanities: "humanities",
	Social: "social",
	BioMedical: "bio-medical",
	Natural: "natural",
} as const;

export type FieldCategory = (typeof FieldCategory)[keyof typeof FieldCategory];

export const FIELD_CATEGORIES: readonly FieldCategory[] = [
	FieldCategory.Humanities,
	FieldCategory.Social,
	FieldCategory.BioMedical,
	FieldCategory.Natural,
] as const;

export const FIELD_CATEGORY_LABELS: Readonly<Record<FieldCategory, string>> = {
	humanities: "人文",
	social: "社会",
	"bio-medical": "生命医療",
	natural: "自然",
};
