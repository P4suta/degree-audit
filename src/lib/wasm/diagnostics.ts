/**
 * TypeScript rendering of the Rust core's structured diagnostics.
 *
 * The WASM core returns diagnostics as machine-readable tagged objects (a
 * presentation-agnostic design); this mirrors `crates/cli/src/diagnostic.rs`,
 * turning them into the Japanese strings the existing UI expects. This is the
 * "structured facts → prose" adapter that lets the domain stay pure.
 */

import {
	FIELD_CATEGORY_LABELS,
	type FieldCategory,
} from "$lib/domain/value-objects/field-category";
import {
	kindDisplayName,
	type SubjectCategoryKind,
} from "$lib/domain/value-objects/subject-category";

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

/** Render one diagnostic as a Japanese line. */
export const formatDiagnostic = (d: Diagnostic): string => {
	switch (d.type) {
		case "progress":
			return `${d.actual} / ${d.required} ${d.unit}`;
		case "total":
			return `合計 ${d.actual} / ${d.required} 単位`;
		case "kindCredits":
			return `${kindDisplayName(d.kind)}: ${d.credits} 単位`;
		case "fieldCredits":
			return `${FIELD_CATEGORY_LABELS[d.field]}: ${d.credits} 単位`;
		case "languageCredits":
			return `${d.language}: ${d.credits} 単位${d.allowed ? "" : "（必修対象外）"}`;
		case "subjectStatus":
			return d.acquired
				? `${d.display}: 取得済み（${d.credits} 単位）`
				: `${d.display}: 未取得`;
		case "cap":
			return `${d.label} 上限 ${d.cap} 単位: 算入 ${d.counted} / 履修 ${d.raw} 単位`;
		case "frame":
			return `${d.label}: ${d.used} / ${d.cap} 単位`;
	}
};

/** Render one exclusion reason as a Japanese Badge label. */
export const formatExclusion = (r: ExclusionReason): string => {
	switch (r.kind) {
		case "otherFacultyCapExceeded":
			return `他学部 ${r.cap} 単位上限超過で算入外`;
		case "frameCapExceeded":
			return `${r.cap} 単位枠（他コース + 他学部 + PF 超過）超過で算入外`;
	}
};
