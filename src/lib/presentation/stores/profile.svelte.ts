import type { StudentProfile } from "../../domain/entities/student-profile.ts";
import { StudentProfile as StudentProfileNS } from "../../domain/entities/student-profile.ts";
import { isOk } from "../../domain/errors/result.ts";

/**
 * In-memory store for the student profile.
 *
 * **Never persisted** (not written to LocalStorage / SessionStorage etc.).
 * Nothing survives closing the tab, reloading, or navigating away. Since the
 * tool handles sensitive grade data, "leave nothing in the browser" is adopted
 * as a strong privacy guarantee.
 */
class ProfileStore {
	#current: StudentProfile | null = $state(null);

	get current(): StudentProfile | null {
		return this.#current;
	}

	set(candidate: unknown): StudentProfile | null {
		const parsed = StudentProfileNS.parse(candidate);
		if (!isOk(parsed)) return null;
		this.#current = parsed.value;
		return this.#current;
	}

	clear(): void {
		this.#current = null;
	}
}

export const profileStore = new ProfileStore();
