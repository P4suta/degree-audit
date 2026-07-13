/**
 * Browser adapter over the Rust/WASM core.
 *
 * The web app runs the very same audit engine the CLI does: this loads the
 * wasm-bindgen module and exposes a typed `importPdf` that returns an
 * `Assessment` shaped exactly like the legacy TypeScript one — the only wire
 * differences (structured diagnostics / exclusion reasons) are normalized to the
 * Japanese strings the existing presentation expects. Nothing downstream changes.
 */

import type { Assessment } from "$lib/application/assess-graduation";
import type { AcademicRecord } from "$lib/domain/entities/academic-record";
import type { StudentProfile } from "$lib/domain/entities/student-profile";

import init, { importPdf as importPdfWasm } from "./degree_audit.js";
import wasmUrl from "./degree_audit_bg.wasm?url";
import {
	type Diagnostic,
	type ExclusionReason,
	formatDiagnostic,
	formatExclusion,
} from "./diagnostics";

// Raw shapes produced by the Rust core. The runtime shapes are identical to the
// domain types except for `diagnostics` and `excludedCourses[].reason`; branded
// domain types are applied by casting at the boundary.
interface RawSpec {
	satisfied: boolean;
	required: number;
	actual: number;
	unit?: string;
	contributingCourses: unknown[];
	subResults: RawSpec[];
	diagnostics: Diagnostic[];
	excludedCourses?: { course: unknown; reason: ExclusionReason }[];
}
interface RawStep {
	id: string;
	label: string;
	result: RawSpec;
	consumedCourseIds: string[];
}
interface RawTentative {
	steps: RawStep[];
	total: RawSpec;
	thesisEligibility: RawSpec;
	graduatable: boolean;
}
interface RawAssessment {
	steps: RawStep[];
	leftoverCourses: unknown[];
	total: RawSpec;
	thesisEligibility: RawSpec;
	totalCredits: number;
	totalCreditsRequired: number;
	graduatable: boolean;
	inProgressCredits: number;
	inProgressCourses: unknown[];
	tentative?: RawTentative;
}
interface RawBundle {
	assessment: RawAssessment;
	courses: unknown[];
	profile: unknown;
	skipped: number;
	unknownCategoryCount: number;
}

let ready: Promise<void> | null = null;
const ensureReady = (): Promise<void> => {
	if (ready === null) ready = init(wasmUrl).then(() => undefined);
	return ready;
};

/** Everything one PDF import yields, ready for the existing stores. */
export interface PdfImportBundle {
	assessment: Assessment;
	record: AcademicRecord;
	profile: StudentProfile;
	skipped: number;
	unknownCategoryCount: number;
}

const normalizeSpec = (r: RawSpec): unknown => ({
	satisfied: r.satisfied,
	required: r.required,
	actual: r.actual,
	...(r.unit !== undefined ? { unit: r.unit } : {}),
	contributingCourses: r.contributingCourses,
	subResults: r.subResults.map(normalizeSpec),
	diagnostics: r.diagnostics.map(formatDiagnostic),
	...(r.excludedCourses !== undefined
		? {
				excludedCourses: r.excludedCourses.map((e) => ({
					course: e.course,
					reason: formatExclusion(e.reason),
				})),
			}
		: {}),
});

const normalizeStep = (s: RawStep): unknown => ({
	id: s.id,
	label: s.label,
	result: normalizeSpec(s.result),
	consumedCourseIds: s.consumedCourseIds,
});

const normalizeAssessment = (a: RawAssessment): Assessment =>
	({
		steps: a.steps.map(normalizeStep),
		leftoverCourses: a.leftoverCourses,
		total: normalizeSpec(a.total),
		thesisEligibility: normalizeSpec(a.thesisEligibility),
		totalCredits: a.totalCredits,
		totalCreditsRequired: a.totalCreditsRequired,
		graduatable: a.graduatable,
		inProgressCredits: a.inProgressCredits,
		inProgressCourses: a.inProgressCourses,
		...(a.tentative !== undefined
			? {
					tentative: {
						steps: a.tentative.steps.map(normalizeStep),
						total: normalizeSpec(a.tentative.total),
						thesisEligibility: normalizeSpec(a.tentative.thesisEligibility),
						graduatable: a.tentative.graduatable,
					},
				}
			: {}),
	}) as unknown as Assessment;

/** Import and assess an official PDF transcript entirely in the browser. */
export const importPdf = async (
	bytes: Uint8Array,
): Promise<PdfImportBundle> => {
	await ensureReady();
	// serde-wasm-bindgen hands back a ready JS object (no JSON.parse round-trip).
	const bundle = importPdfWasm(bytes) as unknown as RawBundle;
	const profile = bundle.profile as StudentProfile;
	const record = {
		profile,
		courses: bundle.courses,
	} as unknown as AcademicRecord;
	return {
		assessment: normalizeAssessment(bundle.assessment),
		record,
		profile,
		skipped: bundle.skipped,
		unknownCategoryCount: bundle.unknownCategoryCount,
	};
};
