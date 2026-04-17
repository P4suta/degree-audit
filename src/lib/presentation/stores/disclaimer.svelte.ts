/**
 * 免責事項の同意状態をメモリ上で保持するストア。
 *
 * 他の store と同じく **永続化しない**：タブを閉じる・リロードする・別サイトへ
 * 離脱するたびに false に戻り、免責モーダルが再度表示される。
 *
 * 毎セッションでの再確認は意図的。卒業要件という人の進路に関わる判定を扱う
 * ため、単発の「同意を押した事実」を記憶して済ませるのではなく、利用者が
 * 毎回その前提を認識することを重視する。
 */
class DisclaimerStore {
	#acknowledged: boolean = $state(false);

	get acknowledged(): boolean {
		return this.#acknowledged;
	}

	acknowledge(): void {
		this.#acknowledged = true;
	}

	reset(): void {
		this.#acknowledged = false;
	}
}

export const disclaimerStore = new DisclaimerStore();
