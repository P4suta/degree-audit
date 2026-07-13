import { describe, expect, it, vi } from "vitest";
import { yieldToMain } from "./yield.ts";

describe("yieldToMain", () => {
	it("resolves asynchronously (not synchronously)", async () => {
		let resolved = false;
		const promise = yieldToMain().then(() => {
			resolved = true;
		});
		expect(resolved).toBe(false);
		await promise;
		expect(resolved).toBe(true);
	});

	it("falls back to setTimeout when requestAnimationFrame is not available", async () => {
		const originalWindow = globalThis.window;
		const originalSetTimeout = globalThis.setTimeout;
		try {
			// remove window to force the setTimeout branch
			vi.stubGlobal("window", undefined);
			const spy = vi.fn((cb: () => void, _ms?: number) => {
				originalSetTimeout(cb, 0);
				return 0 as unknown as ReturnType<typeof setTimeout>;
			});
			vi.stubGlobal("setTimeout", spy);
			await yieldToMain();
			expect(spy).toHaveBeenCalled();
		} finally {
			vi.stubGlobal("window", originalWindow);
			vi.stubGlobal("setTimeout", originalSetTimeout);
		}
	});

	it("uses requestAnimationFrame when available", async () => {
		const rAFCalled = vi.fn((cb: FrameRequestCallback) => {
			cb(0);
			return 0;
		});
		const fakeWindow = { requestAnimationFrame: rAFCalled };
		const originalWindow = globalThis.window;
		try {
			vi.stubGlobal("window", fakeWindow);
			await yieldToMain();
			expect(rAFCalled).toHaveBeenCalled();
		} finally {
			vi.stubGlobal("window", originalWindow);
		}
	});
});
