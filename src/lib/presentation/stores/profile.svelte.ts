import type { StudentProfile } from "../../domain/entities/student-profile.ts";
import { StudentProfile as StudentProfileNS } from "../../domain/entities/student-profile.ts";
import { isOk } from "../../domain/errors/result.ts";

/**
 * 学生プロフィールのメモリ保持ストア。
 *
 * **永続化はしない**（LocalStorage / SessionStorage 等に書き出さない）。
 * タブを閉じる・リロードする・別サイトへ離脱する — いずれの場合も情報は
 * 残らない。卒業要件判定ツールは成績という機微情報を扱うため、
 * 「ブラウザに何も残さない」ことをプライバシー面の強い保証として採用する。
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
