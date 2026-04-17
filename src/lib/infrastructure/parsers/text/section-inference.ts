import { matchKey } from "../../../domain/text/normalize.ts";

export type SectionLevel = "top" | "mid" | "leaf";

/**
 * 階層ごとに必須の親情報が変わるので discriminated union で型分けする。
 * `mid` は top 必須、`leaf` は top/mid 必須。これによりパース側の
 * `hint.top ?? state.top` のような defensive fallback を型レベルで削れる。
 */
export type SectionHint =
	| { readonly level: "top"; readonly value: string }
	| { readonly level: "mid"; readonly value: string; readonly top: string }
	| {
			readonly level: "leaf";
			readonly value: string;
			readonly top: string;
			readonly mid: string;
	  };

/**
 * セクション名と階層情報の逆引き表。
 *
 * テキストコピペには PDF の `[]` / `《》` / `〈〉` のような階層記号が無い。
 * また「教養科目」だけ部分コピペされると top="共通教育" が不明のまま。
 * このテーブルがあれば、mid / leaf 単独でも正しい breadcrumb を組み立てられる。
 *
 * 比較は `matchKey()` で NFKC + decorative 除去 + lowercase 正規化してから行うので、
 * 全角・半角、空白の差は自動で吸収する。
 */
const HINTS: readonly SectionHint[] = [
	// Top 層
	{ level: "top", value: "共通教育" },
	{ level: "top", value: "専門科目" },
	// Mid 層（共通教育配下）
	{ level: "mid", value: "初年次科目", top: "共通教育" },
	{ level: "mid", value: "教養科目", top: "共通教育" },
	// Mid 層（専門科目配下）
	{ level: "mid", value: "プラットフォーム科目", top: "専門科目" },
	{ level: "mid", value: "ゼミナール科目", top: "専門科目" },
	{ level: "mid", value: "選択科目", top: "専門科目" },
	// Leaf（教養科目 / 4 分野 + 外国語 + キャリア形成支援）
	{
		level: "leaf",
		value: "人文分野",
		top: "共通教育",
		mid: "教養科目",
	},
	{
		level: "leaf",
		value: "社会分野",
		top: "共通教育",
		mid: "教養科目",
	},
	{
		level: "leaf",
		value: "生命医療分野",
		top: "共通教育",
		mid: "教養科目",
	},
	{
		level: "leaf",
		value: "自然分野",
		top: "共通教育",
		mid: "教養科目",
	},
	{
		level: "leaf",
		value: "外国語分野",
		top: "共通教育",
		mid: "教養科目",
	},
	{
		level: "leaf",
		value: "キャリア形成支援分野",
		top: "共通教育",
		mid: "教養科目",
	},
	// Leaf（プラットフォーム科目配下）
	{
		level: "leaf",
		value: "基礎科目Ａ群",
		top: "専門科目",
		mid: "プラットフォーム科目",
	},
	{
		level: "leaf",
		value: "基礎科目Ｂ群",
		top: "専門科目",
		mid: "プラットフォーム科目",
	},
	{
		level: "leaf",
		value: "外国語科目",
		top: "専門科目",
		mid: "プラットフォーム科目",
	},
	{
		level: "leaf",
		value: "発展科目",
		top: "専門科目",
		mid: "プラットフォーム科目",
	},
	// Leaf（ゼミナール科目配下）
	{
		level: "leaf",
		value: "ゼミナールI・II",
		top: "専門科目",
		mid: "ゼミナール科目",
	},
	{
		level: "leaf",
		value: "ゼミナールIII・IV",
		top: "専門科目",
		mid: "ゼミナール科目",
	},
	// Leaf（選択科目配下）
	{
		level: "leaf",
		value: "他コース専門科目",
		top: "専門科目",
		mid: "選択科目",
	},
	{
		level: "leaf",
		value: "他学部専門科目",
		top: "専門科目",
		mid: "選択科目",
	},
];

const HINT_BY_KEY: ReadonlyMap<string, SectionHint> = new Map(
	HINTS.map((h) => [matchKey(h.value), h]),
);

export const findSectionHint = (name: string): SectionHint | undefined => {
	const key = matchKey(name);
	if (key === "") return undefined;
	return HINT_BY_KEY.get(key);
};

/**
 * セクション名が既知のものかどうか。`findSectionHint` と等価だが
 * 呼び出し側の意図を明確にするためのエイリアス。
 */
export const isKnownSection = (name: string): boolean =>
	findSectionHint(name) !== undefined;
