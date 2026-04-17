/**
 * イベントループに 1 frame 相当の時間を譲る。長い同期処理の前に 1 度呼ぶだけ
 * でも、ローディング表示 / スピナーが描画されるので体感フリーズがなくなる。
 *
 * requestAnimationFrame があればそれを、無ければ setTimeout(0) にフォールバック。
 * SSR / テスト環境では rAF が存在しないため window チェックで判定する。
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
