/**
 * Renders the Rust core's structured diagnostics into localized prose.
 *
 * The WASM core returns diagnostics as machine-readable tagged objects; this is
 * the "structured facts → localized prose" adapter, resolving keys (kind, field,
 * unit) through the i18n catalog. Embedded domain content — language and named-
 * subject strings — is passed through as the core provides it.
 */

import type { FieldCategory } from "$lib/domain/value-objects/field-category";
import type { SubjectCategoryKind } from "$lib/domain/value-objects/subject-category";
import { fieldLabel, kindLabel, unitLabel } from "$lib/presentation/i18n/labels";
import * as m from "$lib/paraglide/messages";

/** A structured diagnostic as emitted by the Rust `Diagnostic` enum (tag = "type"). */
export type Diagnostic =
	| { type: "progress"; actual: number; required: number; unit: string }
	| { type: "total"; actual: number; required: number }
	| { type: "kindCredits"; kind: SubjectCategoryKind; credits: number }
	| { type: "fieldCredits"; field: FieldCategory; credits: number }
	| {
			type: "languageCredits";
			language: string;
			credits: number;
			allowed: boolean;
	  }
	| {
			type: "subjectStatus";
			display: string;
			acquired: boolean;
			credits: number;
	  }
	| { type: "cap"; label: string; cap: number; counted: number; raw: number }
	| { type: "frame"; label: string; used: number; cap: number };

/** A structured exclusion reason as emitted by the Rust `ExclusionReason` enum (tag = "kind"). */
export type ExclusionReason =
	| { kind: "otherFacultyCapExceeded"; cap: number }
	| { kind: "frameCapExceeded"; cap: number };

/** Render one diagnostic as a localized line. */
export const formatDiagnostic = (d: Diagnostic): string => {
	switch (d.type) {
		case "progress":
			return m.diag_progress({
				actual: d.actual,
				required: d.required,
				unit: unitLabel(d.unit),
			});
		case "total":
			return m.diag_total({ actual: d.actual, required: d.required });
		case "kindCredits":
			return m.diag_kind_credits({
				kind: kindLabel(d.kind),
				credits: d.credits,
			});
		case "fieldCredits":
			return m.diag_field_credits({
				field: fieldLabel(d.field),
				credits: d.credits,
			});
		case "languageCredits":
			return d.allowed
				? m.diag_language_credits({
						language: d.language,
						credits: d.credits,
					})
				: m.diag_language_credits_excluded({
						language: d.language,
						credits: d.credits,
					});
		case "subjectStatus":
			return d.acquired
				? m.diag_subject_acquired({
						display: d.display,
						credits: d.credits,
					})
				: m.diag_subject_not_acquired({ display: d.display });
		case "cap":
			return m.diag_cap({
				label: d.label,
				cap: d.cap,
				counted: d.counted,
				raw: d.raw,
			});
		case "frame":
			return m.diag_frame({ label: d.label, used: d.used, cap: d.cap });
	}
};

/** Render one exclusion reason as a localized Badge label. */
export const formatExclusion = (r: ExclusionReason): string => {
	switch (r.kind) {
		case "otherFacultyCapExceeded":
			return m.exclusion_other_faculty_cap({ cap: r.cap });
		case "frameCapExceeded":
			return m.exclusion_frame_cap({ cap: r.cap });
	}
};
