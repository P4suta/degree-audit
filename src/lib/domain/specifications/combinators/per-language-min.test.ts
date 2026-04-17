import { describe, expect, it } from "vitest";
import { Course } from "../../entities/course.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import { perLanguageMin } from "./per-language-min.ts";

const lang = (id: string, language: string, credit: number) =>
	Course.of({
		id: CourseId.of(id),
		name: `${language}-${id}`,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.liberalForeignLanguage(language),
		rawCategoryLabel: "raw",
	});

const other = (id: string, credit: number) =>
	Course.of({
		id: CourseId.of(id),
		name: id,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.electiveOwnCourse(),
		rawCategoryLabel: "raw",
	});

describe("perLanguageMin without allowedLanguages", () => {
	const spec = perLanguageMin({
		id: "lang",
		label: "外国語",
		requiredPerLanguage: 4,
		requiredLanguageCount: 1,
	});

	it("satisfies when any single language reaches the per-language threshold", () => {
		const pool = [lang("e1", "英語", 2), lang("e2", "英語", 2)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
		expect(r.actual).toBe(1);
	});

	it("does not satisfy when credits are spread across languages below threshold", () => {
		const pool = [lang("e1", "英語", 2), lang("g1", "ドイツ語", 2)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(false);
	});

	it("ignores non foreign-language courses", () => {
		const r = spec.evaluate({ pool: [other("o1", 8)] });
		expect(r.contributingCourses).toHaveLength(0);
	});
});

describe("perLanguageMin with allowedLanguages", () => {
	const spec = perLanguageMin({
		id: "lang-allow",
		label: "必修対象外国語",
		requiredPerLanguage: 4,
		requiredLanguageCount: 1,
		allowedLanguages: [
			"ドイツ語",
			"フランス語",
			"中国語",
			"韓国語",
			"朝鮮語",
			"スペイン語",
		],
	});

	it("English alone does not satisfy", () => {
		const pool = [lang("e1", "英語", 4), lang("e2", "英語", 4)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(false);
		expect(r.actual).toBe(0);
		expect(r.diagnostics.some((d) => d.includes("必修対象言語外"))).toBe(true);
	});

	it("4 credits in German satisfies", () => {
		const pool = [lang("g1", "ドイツ語", 2), lang("g2", "ドイツ語", 2)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
	});

	it("tolerates halfwidth / fullwidth variants via matchKey normalization", () => {
		const pool = [lang("g1", "ドイツ語", 4)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
	});

	it("Korean and 朝鮮語 both qualify as allowed (treated as separate languages)", () => {
		const pool = [
			lang("k1", "韓国語", 2),
			lang("k2", "韓国語", 2),
			lang("c1", "朝鮮語", 2),
		];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
	});
});

describe("perLanguageMin with R6+ introductory/foreign-language kind", () => {
	const introLang = (id: string, language: string, credit: number) =>
		Course.of({
			id: CourseId.of(id),
			name: `${language}-${id}`,
			credit: Credit.of(credit),
			grade: Grade.Yu,
			category: SubjectCategory.introForeignLanguage(language),
			rawCategoryLabel: "raw",
		});

	it("counts introductory/foreign-language courses when kinds is specified", () => {
		const spec = perLanguageMin({
			id: "intro-lang",
			label: "intro",
			requiredPerLanguage: 4,
			requiredLanguageCount: 1,
			kinds: ["common-education/introductory/foreign-language"],
		});
		const pool = [
			introLang("g1", "ドイツ語", 2),
			introLang("g2", "ドイツ語", 2),
		];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
		expect(r.actual).toBe(1);
	});

	it("ignores liberal/foreign-language when only introductory kind is allowed", () => {
		const spec = perLanguageMin({
			id: "intro-lang",
			label: "intro",
			requiredPerLanguage: 4,
			requiredLanguageCount: 1,
			kinds: ["common-education/introductory/foreign-language"],
		});
		const pool = [lang("g1", "ドイツ語", 2), lang("g2", "ドイツ語", 2)];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(false);
	});
});

describe("perLanguageMin safety", () => {
	it("throws when a non-language-bearing kind is passed", () => {
		expect(() =>
			perLanguageMin({
				id: "bad",
				label: "bad",
				requiredPerLanguage: 1,
				requiredLanguageCount: 1,
				kinds: ["common-education/primary"],
			}),
		).toThrow();
	});
});
