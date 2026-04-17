import { goto } from "$app/navigation";
import { DomainError } from "../domain/errors/domain-error.ts";
import { ErrorCode } from "../domain/errors/error-code.ts";
import { errorsStore } from "./stores/errors.svelte.ts";

/**
 * Wraps SvelteKit's `goto()` so navigation failures (guard rejection, network
 * errors, etc.) surface as a DomainError in errorsStore instead of silently
 * disappearing via an unhandled promise rejection.
 */
export const safeGoto = async (path: string): Promise<void> => {
	try {
		await goto(path);
	} catch (cause) {
		errorsStore.push(
			new DomainError({
				code: ErrorCode.NavigationFailed,
				message: `Navigation to '${path}' failed`,
				userMessage:
					"画面遷移に失敗しました。ページを再読み込みしてもう一度お試しください。",
				context: { path },
				cause,
			}),
		);
	}
};
