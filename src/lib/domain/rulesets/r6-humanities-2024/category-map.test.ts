import { describe, expect, it } from "vitest";
import { r6CategoryMap } from "./category-map.ts";

describe("r6CategoryMap", () => {
	it("maps 共通教育 / 導入科目群 / 学びかた科目 → introCoreLearning", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 導入科目群 / 学びかた科目",
		});
		expect(c.kind).toBe("common-education/introductory/core-learning");
	});

	it("maps 国際コミュニケーション / 基軸英語 → introCoreEnglish", () => {
		const c = r6CategoryMap({
			rawLabel:
				"共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 基軸英語",
		});
		expect(c.kind).toBe("common-education/introductory/core-english");
	});

	it("maps 国際コミュニケーション / 初修外国語 ドイツ語 → introForeignLanguage(ドイツ語)", () => {
		const c = r6CategoryMap({
			rawLabel:
				"共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 初修外国語",
			courseName: "ドイツ語 I",
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
		if (c.kind === "common-education/introductory/foreign-language") {
			expect(c.language).toBe("ドイツ語");
		}
	});

	it("maps 数理・データサイエンス・AI → introMathAi", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 導入科目群 / 数理・データサイエンス・AI 科目",
		});
		expect(c.kind).toBe("common-education/introductory/math-ai");
	});

	it("maps 教養科目群 / 生活 → liberalGroupLife", () => {
		const c = r6CategoryMap({ rawLabel: "共通教育 / 教養科目群 / 生活" });
		expect(c.kind).toBe("common-education/liberal-group/life");
	});

	it("maps 教養 / 医療・健康・スポーツ → liberalGroupHealthSports", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 教養科目群 / 医療・健康・スポーツ",
		});
		expect(c.kind).toBe("common-education/liberal-group/health-sports");
	});

	it("maps 教養 / 芸術 → liberalGroupArts", () => {
		const c = r6CategoryMap({ rawLabel: "共通教育 / 教養科目群 / 芸術" });
		expect(c.kind).toBe("common-education/liberal-group/arts");
	});

	it("maps 教養 / 人文・社会科学系 → liberalGroupHumanitiesSocial", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 教養科目群 / 人文・社会科学系領域",
		});
		expect(c.kind).toBe("common-education/liberal-group/humanities-social");
	});

	it("maps 教養 / 自然科学系 → liberalGroupNaturalScience", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 教養科目群 / 自然科学系領域",
		});
		expect(c.kind).toBe("common-education/liberal-group/natural-science");
	});

	it("maps 教養 / 複合領域 → liberalGroupComplex", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 教養科目群 / 複合領域",
		});
		expect(c.kind).toBe("common-education/liberal-group/complex");
	});

	it("maps PF / 学部共通科目 → platformFacultyCommon", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / プラットフォーム科目 / 学部共通科目",
		});
		expect(c.kind).toBe("platform/faculty-common");
	});

	it("maps PF / 人文科学分野 → platformHumanities", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / プラットフォーム科目 / 人文科学分野",
		});
		expect(c.kind).toBe("platform/humanities");
	});

	it("maps PF / グローバル研究分野 → platformGlobalStudies", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / プラットフォーム科目 / グローバル研究分野",
		});
		expect(c.kind).toBe("platform/global-studies");
	});

	it("maps PF / 社会科学分野 → platformSocialScience", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / プラットフォーム科目 / 社会科学分野",
		});
		expect(c.kind).toBe("platform/social-science");
	});

	it("maps ゼミナール V・VI → seminar56Thesis", () => {
		const c = r6CategoryMap({ rawLabel: "専門科目 / ゼミナール V・VI" });
		expect(c.kind).toBe("seminar/5-6-thesis");
	});

	it("maps 他学部専門科目 → electiveOtherFaculty", () => {
		const c = r6CategoryMap({ rawLabel: "選択科目 / 他学部専門科目" });
		expect(c.kind).toBe("elective/other-faculty");
	});

	it("returns unknown for empty label", () => {
		const c = r6CategoryMap({ rawLabel: "" });
		expect(c.kind).toBe("unknown");
	});

	it("maps 卒業論文 course name → seminar56Thesis", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / ゼミナール科目",
			courseName: "卒業論文",
		});
		expect(c.kind).toBe("seminar/5-6-thesis");
	});

	it("maps ゼミナール III（前期） → seminar34Spring", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / ゼミナール科目 / ゼミナールIII",
			courseName: "哲学演習I",
		});
		expect(c.kind).toBe("seminar/3-4/spring");
	});

	it("maps ゼミナール III（後期=演習IV） → seminar34Fall", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / ゼミナール科目 / ゼミナールIII",
			courseName: "哲学演習IV",
		});
		expect(c.kind).toBe("seminar/3-4/fall");
	});

	it("maps ゼミナール III（演習II が末尾） → seminar34Fall", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / ゼミナール科目 / ゼミナールIII",
			courseName: "歴史学演習II",
		});
		expect(c.kind).toBe("seminar/3-4/fall");
	});

	it("maps ゼミナール（フォールバック） → seminar12", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目 / ゼミナール科目",
		});
		expect(c.kind).toBe("seminar/1-2");
	});

	it("maps 教養 / 生活 → liberalGroupLife", () => {
		const c = r6CategoryMap({ rawLabel: "共通教育 / 教養科目群 / 生活" });
		expect(c.kind).toBe("common-education/liberal-group/life");
	});

	it("maps 教養 / キャリア形成 → liberalGroupCareer", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 教養科目群 / キャリア形成",
		});
		expect(c.kind).toBe("common-education/liberal-group/career");
	});

	it("maps 他コース → electiveOtherCourse", () => {
		const c = r6CategoryMap({ rawLabel: "選択科目 / 他コース専門科目" });
		expect(c.kind).toBe("elective/other-course");
	});

	it("maps 自コース専門教育 → electiveOwnCourse", () => {
		const c = r6CategoryMap({ rawLabel: "専門教育" });
		expect(c.kind).toBe("elective/own-course");
	});

	it("maps 単位互換 → electiveOtherFaculty", () => {
		const c = r6CategoryMap({ rawLabel: "単位互換" });
		expect(c.kind).toBe("elective/other-faculty");
	});

	it("falls back to language inference from label when courseName has none", () => {
		const c = r6CategoryMap({
			rawLabel:
				"共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 初修外国語 / フランス語",
			courseName: "",
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
		if (c.kind === "common-education/introductory/foreign-language") {
			expect(c.language).toBe("フランス語");
		}
	});

	it("falls back to 外国語 literal when no language inferred", () => {
		const c = r6CategoryMap({
			rawLabel:
				"共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 初修外国語",
			courseName: "",
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
		if (c.kind === "common-education/introductory/foreign-language") {
			expect(c.language).toBe("外国語");
		}
	});

	it("returns unknown for unrecognized label", () => {
		const c = r6CategoryMap({ rawLabel: "まったく関係ない区分" });
		expect(c.kind).toBe("unknown");
	});

	it.each([
		["中国語", "中国語"],
		["韓国語", "韓国語"],
		["朝鮮語", "韓国語"],
		["スペイン語", "スペイン語"],
		["ロシア語", "ロシア語"],
		["日本語", "日本語"],
		["独語", "ドイツ語"],
		["仏語", "フランス語"],
		["中語", "中国語"],
		["西語", "スペイン語"],
		["露語", "ロシア語"],
	])("infers introForeignLanguage from name '%s' → %s", (name, expectedLang) => {
		const c = r6CategoryMap({
			rawLabel:
				"共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 初修外国語",
			courseName: `${name} I`,
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
		if (c.kind === "common-education/introductory/foreign-language") {
			expect(c.language).toBe(expectedLang);
		}
	});

	it("detects 卒業論文 via label only (no name)", () => {
		const c = r6CategoryMap({ rawLabel: "専門科目 / 卒業論文" });
		expect(c.kind).toBe("seminar/5-6-thesis");
	});

	it("detects 国際コミュ+外国語 without 初修 keyword → introForeignLanguage", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 外国語",
			courseName: "ドイツ語",
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
	});

	it("matches 教養 / 人文社会 (連結形) → liberalGroupHumanitiesSocial", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 教養科目群 / 人文社会",
		});
		expect(c.kind).toBe("common-education/liberal-group/humanities-social");
	});

	it("infers 英語 when 初修外国語 label + 英語 courseName (edge case)", () => {
		const c = r6CategoryMap({
			rawLabel:
				"共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 初修外国語",
			courseName: "英語 I",
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
		if (c.kind === "common-education/introductory/foreign-language") {
			expect(c.language).toBe("英語");
		}
	});

	it("detects 国際コミュ + 日本語 label (without 初修 keyword) → introForeignLanguage", () => {
		const c = r6CategoryMap({
			rawLabel: "共通教育 / 導入科目群 / 国際コミュニケーション科目群 / 日本語",
			courseName: "日本語 I",
		});
		expect(c.kind).toBe("common-education/introductory/foreign-language");
	});

	it("maps ゼミナール V・VI via courseName only → seminar56Thesis", () => {
		const c = r6CategoryMap({
			rawLabel: "専門科目",
			courseName: "ゼミナール V・VI",
		});
		expect(c.kind).toBe("seminar/5-6-thesis");
	});
});
