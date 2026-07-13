/// <reference lib="webworker" />
//
// Off-main-thread home for the WASM core. Instantiating the ~570KB module (first
// call) and parsing + assessing the PDF transcript used to run on the main thread
// and blocked input and paint right after the drop. Here it no longer does. The
// main thread talks to this worker through the tiny request/response protocol
// below (see index.ts).

import initWasm, { importPdf as importPdfWasm } from "./degree_audit.js";
import wasmUrl from "./degree_audit_bg.wasm?url";

/** One import request: the transcript bytes, transferred (not copied) in. The
 *  byteOffset/byteLength pin the exact view in case the buffer is larger. */
interface ImportRequest {
	id: number;
	buffer: ArrayBuffer;
	byteOffset: number;
	byteLength: number;
}

// Instantiate the module exactly once, however many transcripts get dropped.
let ready: Promise<void> | null = null;
const ensureReady = (): Promise<void> => {
	if (ready === null) ready = initWasm(wasmUrl).then(() => undefined);
	return ready;
};

self.onmessage = async (e: MessageEvent<ImportRequest>) => {
	const { id, buffer, byteOffset, byteLength } = e.data;
	try {
		await ensureReady();
		// The expensive work — module instantiate (first call), PDF parse, assess,
		// and marshaling the result — happens here, off the main thread.
		const bytes = new Uint8Array(buffer, byteOffset, byteLength);
		const result = importPdfWasm(bytes);
		self.postMessage({ id, ok: true, result });
	} catch (err) {
		self.postMessage({
			id,
			ok: false,
			error: err instanceof Error ? err.message : String(err),
		});
	}
};
