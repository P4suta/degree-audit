import { describe, expect, it } from "vitest";
import { Course } from "../../entities/course.ts";
import { CourseId } from "../../value-objects/course-id.ts";
import { Credit } from "../../value-objects/credit.ts";
import { Grade } from "../../value-objects/grade.ts";
import { SubjectCategory } from "../../value-objects/subject-category.ts";
import { requireNamedSubjects } from "./require-named-subjects.ts";

const primary = (id: string, name: string, credit = 2) =>
	Course.of({
		id: CourseId.of(id),
		name,
		credit: Credit.of(credit),
		grade: Grade.Yu,
		category: SubjectCategory.primary(),
		rawCategoryLabel: "raw",
	});

const spec = requireNamedSubjects({
	id: "primary-named",
	label: "初年次 6 科目",
	required: [
		{ key: "大学基礎論", displayName: "大学基礎論" },
		{ key: "大学英語入門", displayName: "大学英語入門 I・II" },
		{ key: "英会話", displayName: "英会話 I・II" },
		{ key: "情報処理", displayName: "情報処理" },
		{ key: "学問基礎論", displayName: "学問基礎論" },
		{ key: "課題探求実践セミナー", displayName: "課題探求実践セミナー" },
	],
});

describe("requireNamedSubjects", () => {
	it("satisfies when all required subjects are present", () => {
		const pool = [
			primary("c1", "大学基礎論"),
			primary("c2", "大学英語入門I"),
			primary("c3", "英会話I"),
			primary("c4", "情報処理"),
			primary("c5", "学問基礎論"),
			primary("c6", "課題探求実践セミナー"),
		];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
		expect(r.actual).toBe(6);
		expect(r.subResults.every((sr) => sr.satisfied)).toBe(true);
	});

	it("is not satisfied when any subject is missing", () => {
		const pool = [
			// 大学基礎論 missing
			primary("c2", "大学英語入門I"),
			primary("c3", "英会話I"),
			primary("c4", "情報処理"),
			primary("c5", "学問基礎論"),
			primary("c6", "課題探求実践セミナー"),
		];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(false);
		expect(r.actual).toBe(5);
		const missingSub = r.subResults[0];
		expect(missingSub?.satisfied).toBe(false);
	});

	it("counts 大学英語入門 I and II as the same required subject", () => {
		const pool = [
			primary("c1", "大学基礎論"),
			primary("c2", "大学英語入門I", 1),
			primary("c3", "大学英語入門Ⅱ", 1), // fullwidth roman numeral
			primary("c4", "英会話I"),
			primary("c5", "情報処理"),
			primary("c6", "学問基礎論"),
			primary("c7", "課題探求実践セミナー"),
		];
		const r = spec.evaluate({ pool });
		expect(r.satisfied).toBe(true);
	});

	it("custom matcher lets callers widen or narrow identification", () => {
		const custom = requireNamedSubjects({
			id: "custom",
			label: "カスタム",
			required: [
				{
					key: "anything",
					displayName: "2単位以上の primary 科目",
					matches: (c) =>
						c.category.kind === "common-education/primary" &&
						(c.credit as number) >= 2,
				},
			],
		});
		const pool = [primary("c1", "大学基礎論", 2)];
		expect(custom.evaluate({ pool }).satisfied).toBe(true);
		const pool2 = [primary("c1", "大学基礎論", 1)];
		expect(custom.evaluate({ pool: pool2 }).satisfied).toBe(false);
	});

	it("tolerates fullwidth / halfwidth and decorative spaces via matchKey", () => {
		const pool = [
			primary("c1", "大学　基礎論"), // fullwidth space
			primary("c2", "大学英語入門I"),
			primary("c3", "英会話I"),
			primary("c4", "情報処理"),
			primary("c5", "学問基礎論"),
			primary("c6", "課題探求実践セミナー"),
		];
		const r = spec.evaluate({ pool });
		expect(r.subResults[0]?.satisfied).toBe(true);
	});
});
