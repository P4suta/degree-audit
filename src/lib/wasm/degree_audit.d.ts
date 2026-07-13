/* tslint:disable */
/* eslint-disable */

/**
 * Assess graduation directly from the bytes of an official PDF transcript.
 * The profile (faculty/course/matriculation year) is read from the PDF header.
 * Returns the `Assessment` as a JSON string.
 */
export function assess_from_pdf(bytes: Uint8Array): string;

/**
 * Import an official PDF transcript and assess it in one call, returning a JSON
 * bundle (`{ assessment, courses, profile, skipped, unknownCategoryCount }`) that
 * the SvelteKit front-end feeds straight into its existing stores.
 */
export function import_pdf_json(bytes: Uint8Array): string;

/**
 * List the available rule sets as a JSON array of `{ id, displayName, specificity }`.
 */
export function rule_sets_json(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly assess_from_pdf: (a: number, b: number) => [number, number, number, number];
    readonly import_pdf_json: (a: number, b: number) => [number, number, number, number];
    readonly rule_sets_json: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
