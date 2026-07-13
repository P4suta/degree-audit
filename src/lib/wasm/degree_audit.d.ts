/* tslint:disable */
/* eslint-disable */

/**
 * Assess graduation directly from the bytes of an official PDF transcript.
 * The profile (faculty/course/matriculation year) is read from the PDF header.
 * Returns the `Assessment` as a JS value.
 *
 * # Errors
 * Same failure modes as [`import_pdf`].
 */
export function assessFromPdf(bytes: Uint8Array): any;

/**
 * Import an official PDF transcript and assess it in one call, returning a
 * structured object (`{ assessment, courses, profile, skipped,
 * unknownCategoryCount }`) that the SvelteKit front-end feeds straight into its
 * existing stores.
 *
 * # Errors
 * Fails if the PDF header is unreadable, no rule set applies, the transcript
 * cannot be imported, or the result cannot be serialized to a JS value.
 */
export function importPdf(bytes: Uint8Array): any;

/**
 * List the available rule sets as an array of `{ id, displayName, specificity }`.
 *
 * # Errors
 * Fails only if the metadata cannot be serialized to a JS value.
 */
export function ruleSets(): any;

/**
 * Route Rust panics to `console.error` for legible stack traces in the browser.
 */
export function start(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly assessFromPdf: (a: number, b: number) => [number, number, number];
    readonly importPdf: (a: number, b: number) => [number, number, number];
    readonly ruleSets: () => [number, number, number];
    readonly start: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
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
