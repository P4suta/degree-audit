import { matchKey } from "../../text/normalize.ts";
import { FieldCategory } from "../../value-objects/field-category.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import type { CategoryMap } from "../types.ts";

/**
 * 高知大学「成績閲覧」MHTML で table-extractor が組み立てる階層ラベル
 *   "共通教育 / 初年次科目"
 *   "共通教育 / 教養科目 / 人文分野"
 *   "共通教育 / プラットフォーム科目 / 基礎科目Ａ群"
 *   "ゼミナール / ゼミI・II"
 *   "選択科目 / 他学部専門科目"
 *   "選択科目"（サブ区分なし）
 * 等を Domain の SubjectCategory に正規化する。
 *
 * マッチ判定の前に `matchKey()`（NFKC + 装飾記号除去 + 空白除去 + 小文字化）を
 * 通すので、rule 側で `["基礎Ａ","基礎A","基幹Ａ",...]` のような表記ゆれ吸収を
 * 書かず、正規形の 1 パターンだけ書けば済む。
 */

const languageFromText = (normalizedText: string): string | undefined => {
	if (normalizedText.includes("英語")) return "英語";
	if (normalizedText.includes("ドイツ語") || normalizedText.includes("独語"))
		return "ドイツ語";
	if (normalizedText.includes("フランス語") || normalizedText.includes("仏語"))
		return "フランス語";
	if (normalizedText.includes("中国語") || normalizedText.includes("中語"))
		return "中国語";
	if (normalizedText.includes("韓国語") || normalizedText.includes("朝鮮語"))
		return "韓国語";
	if (normalizedText.includes("スペイン語") || normalizedText.includes("西語"))
		return "スペイン語";
	if (normalizedText.includes("ロシア語") || normalizedText.includes("露語"))
		return "ロシア語";
	if (normalizedText.includes("日本語")) return "日本語";
	return undefined;
};

interface NormalizedLookup {
	readonly label: string;
	readonly name: string;
}

interface Rule {
	readonly when: (n: NormalizedLookup) => boolean;
	readonly build: (n: NormalizedLookup) => SubjectCategory;
}

const hasAll = (haystack: string, needles: readonly string[]): boolean =>
	needles.every((n) => haystack.includes(n));

const rules: readonly Rule[] = [
	// 卒業論文・ゼミナール V・VI
	{
		when: ({ label, name }) =>
			label.includes("卒業論文") ||
			name.includes("卒業論文") ||
			(label.includes("ゼミ") && label.includes("v・vi")) ||
			(name.includes("ゼミナール") && name.includes("v・vi")),
		build: () => SubjectCategory.seminar56Thesis(),
	},
	// ゼミナール III・IV
	{
		when: ({ label }) => label.includes("ゼミ") && label.includes("iii"),
		build: () => SubjectCategory.seminar34(),
	},
	// ゼミナール I・II（ゼミ系フォールバック）
	{
		when: ({ label }) => label.includes("ゼミ"),
		build: () => SubjectCategory.seminar12(),
	},
	// 共通教育 / 初年次
	{
		when: ({ label }) => hasAll(label, ["共通教育", "初年次"]),
		build: () => SubjectCategory.primary(),
	},
	// PF 基礎 A 群
	{
		when: ({ label }) =>
			label.includes("プラット") &&
			label.includes("基礎") &&
			label.includes("a"),
		build: () => SubjectCategory.platformBasicA(),
	},
	// PF 基礎 B 群
	{
		when: ({ label }) =>
			label.includes("プラット") &&
			label.includes("基礎") &&
			label.includes("b"),
		build: () => SubjectCategory.platformBasicB(),
	},
	// PF 外国語
	{
		when: ({ label }) => label.includes("プラット") && label.includes("外国語"),
		build: () => SubjectCategory.platformForeignLanguage(),
	},
	// PF 発展
	{
		when: ({ label }) => label.includes("プラット") && label.includes("発展"),
		build: () => SubjectCategory.platformAdvanced(),
	},
	// 共通教育 / 教養 / 外国語
	{
		when: ({ label }) =>
			label.includes("教養") &&
			(label.includes("外国語") || label.includes("語学")),
		build: ({ label, name }) =>
			SubjectCategory.liberalForeignLanguage(
				languageFromText(name) ?? languageFromText(label) ?? "外国語",
			),
	},
	// 共通教育 / 教養 / キャリア
	{
		when: ({ label }) => label.includes("教養") && label.includes("キャリア"),
		build: () => SubjectCategory.liberalCareer(),
	},
	// 共通教育 / 教養 / 人文
	{
		when: ({ label }) => label.includes("教養") && label.includes("人文"),
		build: () => SubjectCategory.liberalField(FieldCategory.Humanities),
	},
	// 共通教育 / 教養 / 社会
	{
		when: ({ label }) => label.includes("教養") && label.includes("社会"),
		build: () => SubjectCategory.liberalField(FieldCategory.Social),
	},
	// 共通教育 / 教養 / 生命医療
	{
		when: ({ label }) =>
			label.includes("教養") &&
			(label.includes("生命") ||
				label.includes("医療") ||
				label.includes("生医")),
		build: () => SubjectCategory.liberalField(FieldCategory.BioMedical),
	},
	// 共通教育 / 教養 / 自然
	{
		when: ({ label }) => label.includes("教養") && label.includes("自然"),
		build: () => SubjectCategory.liberalField(FieldCategory.Natural),
	},
	// 選択 / 他学部
	{
		when: ({ label }) =>
			label.includes("他学部") ||
			label.includes("他学科") ||
			label.includes("単位互換"),
		build: () => SubjectCategory.electiveOtherFaculty(),
	},
	// 選択 / 他コース
	{
		when: ({ label }) => label.includes("他コース"),
		build: () => SubjectCategory.electiveOtherCourse(),
	},
	// 選択科目（サブ区分なし）/ 自コース / 専門教育
	{
		when: ({ label }) =>
			label.includes("選択科目") ||
			label.includes("自コース") ||
			label.includes("専門教育") ||
			label.includes("専門科目"),
		build: () => SubjectCategory.electiveOwnCourse(),
	},
];

export const defaultCategoryMap: CategoryMap = ({ rawLabel, courseName }) => {
	const normalizedLabel = matchKey(rawLabel);
	if (normalizedLabel === "") return SubjectCategory.unknown(rawLabel);
	const lookup: NormalizedLookup = {
		label: normalizedLabel,
		name: matchKey(courseName ?? ""),
	};
	for (const rule of rules) {
		if (rule.when(lookup)) return rule.build(lookup);
	}
	return SubjectCategory.unknown(rawLabel);
};
