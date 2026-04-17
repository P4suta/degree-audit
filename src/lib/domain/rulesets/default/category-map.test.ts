import { describe, expect, it } from "vitest";
import { FieldCategory } from "../../value-objects/field-category.ts";
import { defaultCategoryMap } from "./category-map.ts";

describe("defaultCategoryMap", () => {
	it.each([
		["共通教育 / 初年次科目", { kind: "common-education/primary" }],
		[
			"共通教育 / 教養科目 / 人文分野",
			{
				kind: "common-education/liberal/field",
				field: FieldCategory.Humanities,
			},
		],
		[
			"共通教育 / 教養科目 / 社会分野",
			{ kind: "common-education/liberal/field", field: FieldCategory.Social },
		],
		[
			"共通教育 / 教養科目 / 自然分野",
			{ kind: "common-education/liberal/field", field: FieldCategory.Natural },
		],
		[
			"共通教育 / 教養科目 / 生命医療分野",
			{
				kind: "common-education/liberal/field",
				field: FieldCategory.BioMedical,
			},
		],
		[
			"共通教育 / 教養科目 / 生医分野",
			{
				kind: "common-education/liberal/field",
				field: FieldCategory.BioMedical,
			},
		],
		[
			"共通教育 / 教養科目 / キャリア形成支援",
			{ kind: "common-education/liberal/career" },
		],
		[
			"共通教育 / 教養科目 / 外国語 / 英語I",
			{
				kind: "common-education/liberal/foreign-language",
				language: "英語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / ドイツ語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "ドイツ語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / フランス語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "フランス語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / 中国語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "中国語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / 韓国語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "韓国語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / スペイン語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "スペイン語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / ロシア語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "ロシア語",
			},
		],
		[
			"共通教育 / 教養科目 / 外国語 / 日本語",
			{
				kind: "common-education/liberal/foreign-language",
				language: "日本語",
			},
		],
		[
			"共通教育 / 教養科目 / 語学その他",
			{
				kind: "common-education/liberal/foreign-language",
				language: "外国語",
			},
		],
		["ゼミナール / ゼミI・II", { kind: "seminar/1-2" }],
		["ゼミナール / ゼミIII・IV", { kind: "seminar/3-4/spring" }],
		["ゼミナール / 卒業論文・ゼミナールV・VI", { kind: "seminar/5-6-thesis" }],
		["卒業論文", { kind: "seminar/5-6-thesis" }],
		["専門教育 / プラットフォーム科目 / 基礎Ａ", { kind: "platform/basic-a" }],
		["専門教育 / プラットフォーム科目 / 基礎Ｂ", { kind: "platform/basic-b" }],
		["専門教育 / プラット / 外国語", { kind: "platform/foreign-language" }],
		["専門教育 / プラットフォーム科目 / 発展", { kind: "platform/advanced" }],
		["選択科目 / 他学部", { kind: "elective/other-faculty" }],
		["選択科目 / 単位互換科目", { kind: "elective/other-faculty" }],
		["選択科目 / 他コース専門科目", { kind: "elective/other-course" }],
		["専門教育 / 自コース専門科目", { kind: "elective/own-course" }],
		["専門教育 / 専門基幹", { kind: "elective/own-course" }],
	])("maps %s correctly", (raw, expected) => {
		expect(defaultCategoryMap({ rawLabel: raw })).toEqual(expected);
	});

	it("returns unknown for an empty label", () => {
		expect(defaultCategoryMap({ rawLabel: "" })).toEqual({
			kind: "unknown",
			raw: "",
		});
	});

	it("returns unknown for unrecognised labels", () => {
		const result = defaultCategoryMap({ rawLabel: "謎のカテゴリ" });
		expect(result).toEqual({ kind: "unknown", raw: "謎のカテゴリ" });
	});

	describe("seminar III・IV spring/fall disambiguation", () => {
		it("routes 演習I to spring", () => {
			const r = defaultCategoryMap({
				rawLabel: "ゼミナール / ゼミIII・IV",
				courseName: "哲学演習I",
			});
			expect(r).toEqual({ kind: "seminar/3-4/spring" });
		});

		it("routes 演習II to fall", () => {
			const r = defaultCategoryMap({
				rawLabel: "ゼミナール / ゼミIII・IV",
				courseName: "哲学演習II",
			});
			expect(r).toEqual({ kind: "seminar/3-4/fall" });
		});

		it("routes 演習IV to fall (covers 演習IV naming variants)", () => {
			const r = defaultCategoryMap({
				rawLabel: "ゼミナール / ゼミIII・IV",
				courseName: "歴史学演習IV",
			});
			expect(r).toEqual({ kind: "seminar/3-4/fall" });
		});

		it("defaults to spring when course name does not distinguish", () => {
			const r = defaultCategoryMap({
				rawLabel: "ゼミナール / ゼミIII・IV",
				courseName: "演習",
			});
			expect(r).toEqual({ kind: "seminar/3-4/spring" });
		});
	});
});
