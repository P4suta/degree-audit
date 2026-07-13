/**
 * Browser adapter over the Rust/WASM core.
 *
 * The web app runs the very same audit engine the CLI does. Module instantiation
 * and PDF parsing happen inside a Web Worker (audit.worker.ts) so the ~570KB
 * instantiate + parse never blocks the main thread right after a drop; this file
 * is the tiny main-thread facade over that worker. `importPdf` returns an
 * `Assessment` shaped exactly like the legacy TypeScript one — the only wire
 * differences (structured diagnostics / exclusion reasons) are normalized to the
 * Japanese strings the existing presentation expects. Nothing downstream changes.
 */

import type { Assessment } from "$lib/application/assessment-types";
import type { AcademicRecord } from "$lib/domain/entities/academic-record";
import type { StudentProfile } from "$lib/domain/entities/student-profile";

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

/** One worker response: the raw bundle on success, or an error message. */
interface WorkerResponse {
	id: number;
	ok: boolean;
	result?: unknown;
	error?: string;
}

// A single worker, created lazily on the first import and reused thereafter.
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<
	number,
	{ resolve: (bundle: RawBundle) => void; reject: (error: Error) => void }
>();

const getWorker = (): Worker => {
	if (worker === null) {
		worker = new Worker(new URL("./audit.worker.ts", import.meta.url), {
			type: "module",
		});
		worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
			const { id, ok, result, error } = e.data;
			const entry = pending.get(id);
			if (entry === undefined) return;
			pending.delete(id);
			if (ok) entry.resolve(result as RawBundle);
			else entry.reject(new Error(error ?? "WASM import failed"));
		};
	}
	return worker;
};

/** Import and assess an official PDF transcript entirely in the browser. The
 *  heavy work runs in a Web Worker; the transcript buffer is transferred (not
 *  copied) into it, so `bytes` is left detached on return. */
export const importPdf = async (
	bytes: Uint8Array,
): Promise<PdfImportBundle> => {
	const id = nextId++;
	const w = getWorker();
	const bundle = await new Promise<RawBundle>((resolve, reject) => {
		pending.set(id, { resolve, reject });
		// Zero-copy transfer of the underlying buffer to the worker.
		w.postMessage(
			{
				id,
				buffer: bytes.buffer,
				byteOffset: bytes.byteOffset,
				byteLength: bytes.byteLength,
			},
			[bytes.buffer],
		);
	});
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
