import { PersistedState } from "runed";
import { StudentProfile } from "../../domain/entities/student-profile.ts";
import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { isOk } from "../../domain/errors/result.ts";
import { errorsStore } from "./errors.svelte.ts";

const STORAGE_KEY = "degree-audit:profile";

interface PersistedProfile {
	readonly facultyId: string;
	readonly courseId: string;
	readonly matriculationYear: number;
	readonly extras?: Readonly<Record<string, string | number>>;
}

const sanitize = (input: unknown): PersistedProfile | null => {
	if (input === null || typeof input !== "object") return null;
	const parsed = StudentProfile.parse(input);
	if (!isOk(parsed)) return null;
	return {
		facultyId: parsed.value.facultyId,
		courseId: parsed.value.courseId,
		matriculationYear: parsed.value.matriculationYear,
		extras: { ...parsed.value.extras },
	};
};

const isQuotaExceeded = (cause: unknown): boolean =>
	cause instanceof DOMException &&
	(cause.name === "QuotaExceededError" ||
		cause.name === "NS_ERROR_DOM_QUOTA_REACHED");

class ProfileStore {
	readonly #persisted = new PersistedState<PersistedProfile | null>(
		STORAGE_KEY,
		null,
	);

	get current(): StudentProfile | null {
		const raw = this.#persisted.current;
		if (raw === null) return null;
		const parsed = StudentProfile.parse(raw);
		return isOk(parsed) ? parsed.value : null;
	}

	set(candidate: unknown): StudentProfile | null {
		const clean = sanitize(candidate);
		try {
			this.#persisted.current = clean;
		} catch (cause) {
			errorsStore.push(
				new DomainError({
					code: isQuotaExceeded(cause)
						? ErrorCode.StorageQuotaExceeded
						: ErrorCode.StudentProfileInvalid,
					message: "Failed to persist StudentProfile to LocalStorage",
					userMessage:
						"学生プロフィールをブラウザ内に保存できませんでした。ブラウザのストレージに空きがあるかご確認ください。",
					context: { storageKey: STORAGE_KEY },
					cause,
				}),
			);
		}
		return this.current;
	}

	clear(): void {
		this.#persisted.current = null;
	}
}

export const profileStore = new ProfileStore();
