export const FieldCategory = {
	Humanities: "humanities",
	Social: "social",
	BioMedical: "bio-medical",
	Natural: "natural",
} as const;

export type FieldCategory = (typeof FieldCategory)[keyof typeof FieldCategory];
