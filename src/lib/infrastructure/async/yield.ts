/**
 * Yield ~one frame to the event loop. Calling this once before a long
 * synchronous task lets a loading/spinner paint, so there is no perceived freeze.
 *
 * Uses requestAnimationFrame when available, else falls back to setTimeout(0).
 * rAF is absent under SSR / tests, hence the window check.
 */
export const yieldToMain = (): Promise<void> =>
	new Promise<void>((resolve) => {
		if (
			typeof window !== "undefined" &&
			typeof window.requestAnimationFrame === "function"
		) {
			window.requestAnimationFrame(() => resolve());
			return;
		}
		setTimeout(resolve, 0);
	});
