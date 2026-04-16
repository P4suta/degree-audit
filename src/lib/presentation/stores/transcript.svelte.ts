import { PersistedState } from "runed";
import { AcademicRecord } from "../../domain/entities/academic-record.ts";
import type { Course } from "../../domain/entities/course.ts";
import { StudentProfile } from "../../domain/entities/student-profile.ts";
import { DomainError } from "../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../domain/errors/error-code.ts";
import { isOk } from "../../domain/errors/result.ts";
import { errorsStore } from "./errors.svelte.ts";

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

const isQuotaExceeded = (cause: unknown): boolean =>
	cause instanceof DOMException &&
	(cause.name === "QuotaExceededError" ||
		cause.name === "NS_ERROR_DOM_QUOTA_REACHED");

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
		const payload: PersistedTranscript = {
			profile: {
				facultyId: record.profile.facultyId,
				courseId: record.profile.courseId,
				matriculationYear: record.profile.matriculationYear,
				extras: { ...record.profile.extras },
			},
			courses: record.courses,
		};
		try {
			this.#persisted.current = payload;
		} catch (cause) {
			errorsStore.push(
				new DomainError({
					code: isQuotaExceeded(cause)
						? ErrorCode.StorageQuotaExceeded
						: ErrorCode.StudentProfileInvalid,
					message: "Failed to persist AcademicRecord to LocalStorage",
					userMessage:
						"成績データをブラウザ内に保存できませんでした。ブラウザのストレージに空きがあるかご確認ください。",
					context: {
						storageKey: STORAGE_KEY,
						courseCount: record.courses.length,
					},
					cause,
				}),
			);
		}
	}

	clear(): void {
		this.#persisted.current = null;
	}
}

export const transcriptStore = new TranscriptStore();
