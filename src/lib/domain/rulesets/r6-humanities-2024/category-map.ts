import { matchKey } from "../../text/normalize.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import type { CategoryMap } from "../types.ts";

/**
 * R6+（2024 年度以降）の成績ページでは階層ラベルが R2-R5 と違う想定で組む：
 *   "共通教育 / 導入科目群 / 学びかた科目"
 *   "共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 基軸英語"
 *   "共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 初修外国語"
 *   "共通教育 / 導入科目群 / 数理・データサイエンス・AI 科目"
 *   "共通教育 / 教養科目群 / 生活"
 *   "共通教育 / 教養科目群 / 医療・健康・スポーツ"
 *   …（7 分野）
 *   "専門科目 / プラットフォーム科目 / 学部共通科目"
 *   "専門科目 / プラットフォーム科目 / 人文科学分野"
 *   …
 *
 * 実データの表記ゆれは現時点では未知。分かる範囲のパターンを
 * `matchKey()` 正規化済みで部分一致させる。他学部 / 他コース / 選択 /
 * ゼミナール / 卒業論文 の判別ロジックは R2-R5 と同じ（共通語彙）。
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
	// === ゼミ / 卒論（両制度共通） ===
	{
		when: ({ label, name }) =>
			label.includes("卒業論文") ||
			name.includes("卒業論文") ||
			(label.includes("ゼミ") && label.includes("v・vi")) ||
			(name.includes("ゼミナール") && name.includes("v・vi")),
		build: () => SubjectCategory.seminar56Thesis(),
	},
	{
		when: ({ label }) => label.includes("ゼミ") && label.includes("iii"),
		build: ({ name }) => {
			if (name.includes("演習iv") || name.endsWith("iv")) {
				return SubjectCategory.seminar34Fall();
			}
			if (name.includes("演習ii") || name.endsWith("ii")) {
				return SubjectCategory.seminar34Fall();
			}
			return SubjectCategory.seminar34Spring();
		},
	},
	{
		when: ({ label }) => label.includes("ゼミ"),
		build: () => SubjectCategory.seminar12(),
	},

	// === 導入科目群（R6+） ===
	// 数理・データサイエンス・AI（「数理」または「データサイエンス」で検出）
	{
		when: ({ label }) =>
			(label.includes("数理") && label.includes("データ")) ||
			label.includes("データサイエンス") ||
			label.includes("データリテラシ"),
		build: () => SubjectCategory.introMathAi(),
	},
	// 基軸英語（国際コミュニケーション内の英語科目）
	{
		when: ({ label }) =>
			(label.includes("基軸英語") ||
				(label.includes("国際コミュ") && label.includes("英語"))) &&
			!label.includes("教養"),
		build: () => SubjectCategory.introCoreEnglish(),
	},
	// 初修外国語・日本語（導入 / 国際コミュニケーション配下）
	{
		when: ({ label }) =>
			(label.includes("初修外国語") ||
				(label.includes("国際コミュ") &&
					(label.includes("外国語") || label.includes("日本語")))) &&
			!label.includes("教養"),
		build: ({ label, name }) =>
			SubjectCategory.introForeignLanguage(
				languageFromText(name) ?? languageFromText(label) ?? "外国語",
			),
	},
	// 学びかた科目（大学基礎論 / 学問基礎論 / 課題探求実践セミナー）
	{
		when: ({ label }) =>
			hasAll(label, ["共通教育"]) &&
			(label.includes("学びかた") ||
				label.includes("学び方") ||
				label.includes("導入科目")),
		build: () => SubjectCategory.introCoreLearning(),
	},

	// === 教養科目群 7 分野（R6+） ===
	// "生活" だけで判定すると "生活と…" のような誤爆が怖いので "教養" 同伴
	{
		when: ({ label }) =>
			label.includes("教養") &&
			(label.includes("医療") ||
				label.includes("健康") ||
				label.includes("スポーツ")),
		build: () => SubjectCategory.liberalGroupHealthSports(),
	},
	{
		when: ({ label }) => label.includes("教養") && label.includes("キャリア"),
		build: () => SubjectCategory.liberalGroupCareer(),
	},
	{
		when: ({ label }) => label.includes("教養") && label.includes("芸術"),
		build: () => SubjectCategory.liberalGroupArts(),
	},
	{
		when: ({ label }) =>
			label.includes("教養") &&
			(label.includes("人文・社会") ||
				(label.includes("人文") && label.includes("社会")) ||
				label.includes("人文社会")),
		build: () => SubjectCategory.liberalGroupHumanitiesSocial(),
	},
	{
		when: ({ label }) =>
			label.includes("教養") &&
			(label.includes("自然科学") || label.includes("自然分野")),
		build: () => SubjectCategory.liberalGroupNaturalScience(),
	},
	{
		when: ({ label }) =>
			label.includes("教養") &&
			(label.includes("複合") || label.includes("総合")),
		build: () => SubjectCategory.liberalGroupComplex(),
	},
	{
		when: ({ label }) => label.includes("教養") && label.includes("生活"),
		build: () => SubjectCategory.liberalGroupLife(),
	},

	// === プラットフォーム（R6+） ===
	{
		when: ({ label }) =>
			label.includes("プラット") && label.includes("学部共通"),
		build: () => SubjectCategory.platformFacultyCommon(),
	},
	{
		when: ({ label }) =>
			label.includes("プラット") && label.includes("人文科学"),
		build: () => SubjectCategory.platformHumanities(),
	},
	{
		when: ({ label }) =>
			label.includes("プラット") &&
			(label.includes("グローバル") || label.includes("国際")),
		build: () => SubjectCategory.platformGlobalStudies(),
	},
	{
		when: ({ label }) =>
			label.includes("プラット") && label.includes("社会科学"),
		build: () => SubjectCategory.platformSocialScience(),
	},

	// === 選択（両制度共通） ===
	{
		when: ({ label }) =>
			label.includes("他学部") ||
			label.includes("他学科") ||
			label.includes("単位互換"),
		build: () => SubjectCategory.electiveOtherFaculty(),
	},
	{
		when: ({ label }) => label.includes("他コース"),
		build: () => SubjectCategory.electiveOtherCourse(),
	},
	{
		when: ({ label }) =>
			label.includes("選択科目") ||
			label.includes("自コース") ||
			label.includes("専門教育") ||
			label.includes("専門科目"),
		build: () => SubjectCategory.electiveOwnCourse(),
	},
];

export const r6CategoryMap: CategoryMap = ({ rawLabel, courseName }) => {
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
