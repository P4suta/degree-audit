import { PersistedState } from "runed";
import { StudentProfile } from "../../domain/entities/student-profile.ts";
import { isOk } from "../../domain/errors/result.ts";

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
		this.#persisted.current = clean;
		return this.current;
	}

	clear(): void {
		this.#persisted.current = null;
	}
}

export const profileStore = new ProfileStore();
