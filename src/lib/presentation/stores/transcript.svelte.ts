import { PersistedState } from "runed";
import { AcademicRecord } from "../../domain/entities/academic-record.ts";
import type { Course } from "../../domain/entities/course.ts";
import { StudentProfile } from "../../domain/entities/student-profile.ts";
import { isOk } from "../../domain/errors/result.ts";

const STORAGE_KEY = "degree-audit:transcript";

interface PersistedTranscript {
	readonly profile: {
		readonly facultyId: string;
		readonly courseId: string;
		readonly matriculationYear: number;
		readonly extras?: Readonly<Record<string, string | number>>;
	};
	readonly courses: readonly Course[];
}

class TranscriptStore {
	readonly #persisted = new PersistedState<PersistedTranscript | null>(
		STORAGE_KEY,
		null,
	);

	get current(): AcademicRecord | null {
		const raw = this.#persisted.current;
		if (raw === null) return null;
		const parsed = StudentProfile.parse(raw.profile);
		if (!isOk(parsed)) return null;
		return AcademicRecord.of(parsed.value, raw.courses);
	}

	set(record: AcademicRecord): void {
		this.#persisted.current = {
			profile: {
				facultyId: record.profile.facultyId,
				courseId: record.profile.courseId,
				matriculationYear: record.profile.matriculationYear,
				extras: { ...record.profile.extras },
			},
			courses: record.courses,
		};
	}

	clear(): void {
		this.#persisted.current = null;
	}
}

export const transcriptStore = new TranscriptStore();
