import type { Registry } from "../domain/rulesets/registry.ts";

/**
 * registry に登録されている全 ruleset の `applicableScopes` から、UI の
 * 「学部」Select に提示すべき選択肢を列挙する。
 *
 * - `opts.course` を指定すると、そのコースを含む学部だけに絞る。未指定または
 *   空文字列なら絞らない（全学部を返す）。
 * - 重複は除き、初出順を保つ（Set の挿入順）
 * - どの ruleset も `applicableScopes` を持たない場合は空配列を返す
 *
 * 双方向カスケードの一方向: ユーザーが先にコースを選んだとき、学部候補を
 * そのコースを含む学部だけに絞り込む。
 */
export const listFacultyOptions = (
	registry: Registry,
	opts: { course?: string } = {},
): readonly string[] => {
	const courseFilter = opts.course ?? "";
	const set = new Set<string>();
	for (const rs of registry.ruleSets) {
		for (const scope of rs.metadata.applicableScopes ?? []) {
			if (courseFilter === "" || scope.course === courseFilter) {
				set.add(scope.faculty);
			}
		}
	}
	return Array.from(set);
};

/**
 * registry に登録されている全 ruleset の `applicableScopes` から、UI の
 * 「コース」Select に提示すべき選択肢を列挙する。
 *
 * - `opts.faculty` を指定すると、その学部のコースだけに絞る。未指定または
 *   空文字列なら絞らない（全コースを返す）。
 * - 重複は除き、初出順を保つ
 *
 * 双方向カスケードのもう一方向: ユーザーが先に学部を選んだとき、コース候補を
 * その学部のコースだけに絞り込む。
 */
export const listCourseOptions = (
	registry: Registry,
	opts: { faculty?: string } = {},
): readonly string[] => {
	const facultyFilter = opts.faculty ?? "";
	const set = new Set<string>();
	for (const rs of registry.ruleSets) {
		for (const scope of rs.metadata.applicableScopes ?? []) {
			if (facultyFilter === "" || scope.faculty === facultyFilter) {
				set.add(scope.course);
			}
		}
	}
	return Array.from(set);
};
