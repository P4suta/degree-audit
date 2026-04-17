/**
 * Progress バーの「完了 / 履修中 / 残り」の幅比率を純粋計算で求める。
 *
 * UI コンポーネントから切り出しておくことで単体テストが書きやすくなる。
 * ロジックは以下：
 *   - actual は確定で算入された値。required を超えたら required で頭打ち
 *   - tentativeActual は「履修中をすべて合格扱いにした時の actual」。
 *     undefined なら履修中情報なし。actual 以下になることは想定外だが、
 *     万一起きても actual を下回らない値として扱う
 *   - 完了 % = min(actual, required) / required
 *   - 履修中 % = (min(tentativeActual, required) - min(actual, required)) / required
 *     これは「バー全体の何パーセントを占めるか」を返す。現場での stack レイアウトは
 *     絶対位置で完了層が履修中層の上に乗るので、履修中層の width は
 *     完了 % + 履修中 % = tentativeRatio を与えて重ねる方が隙間が出にくい
 */
export interface ProgressLayoutInput {
	readonly actual: number;
	readonly required: number;
	readonly tentativeActual?: number | undefined;
}

export interface ProgressLayout {
	/** 完了セクションの幅パーセンテージ（0〜100）。 */
	readonly completedPct: number;
	/**
	 * 完了 + 履修中を合わせた幅パーセンテージ（0〜100）。
	 * Progress 側では完了層の _下敷き_ として履修中層に割り当てる。
	 * 完了 ≤ 履修中 を保証する
	 */
	readonly tentativePct: number;
	/** 履修中セクションが実際に幅を占めるか。= tentativePct > completedPct。 */
	readonly hasInProgress: boolean;
	/** 履修中込みの actual。UI の aria-valuetext 等で使う。 */
	readonly tentativeActualOrActual: number;
}

export const computeProgressLayout = (
	input: ProgressLayoutInput,
): ProgressLayout => {
	const { actual, required, tentativeActual } = input;
	if (required <= 0) {
		return {
			completedPct: 0,
			tentativePct: 0,
			hasInProgress: false,
			tentativeActualOrActual: actual,
		};
	}
	const clampedActual = Math.max(0, Math.min(actual, required));
	const completedPct = (clampedActual / required) * 100;
	const tentActualRaw = tentativeActual ?? actual;
	// 履修中は actual 以上（単調増加）。万一逆転したら actual に張り付ける
	const tentActual = Math.max(actual, tentActualRaw);
	const clampedTent = Math.max(0, Math.min(tentActual, required));
	const tentativePct = (clampedTent / required) * 100;
	return {
		completedPct,
		tentativePct,
		hasInProgress: tentativePct > completedPct,
		tentativeActualOrActual: tentActual,
	};
};

/**
 * バーの状態。Badge / サブテキストの色分岐に使う。
 * - 'satisfied'  = 確定で充足している
 * - 'in-progress' = 確定では不足だが、履修中が合格すれば充足予定
 * - 'unmet'      = 履修中込みでも不足、または履修中情報なしで不足
 */
export type ProgressState = "satisfied" | "in-progress" | "unmet";

export const resolveProgressState = (input: {
	readonly satisfied: boolean;
	readonly tentativeSatisfied?: boolean | undefined;
}): ProgressState => {
	if (input.satisfied) return "satisfied";
	if (input.tentativeSatisfied === true) return "in-progress";
	return "unmet";
};
