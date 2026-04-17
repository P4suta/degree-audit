import { describe, expect, it } from "vitest";
import { createRegistry } from "../domain/rulesets/registry.ts";
import type { RuleSet, RuleSetScope } from "../domain/rulesets/types.ts";
import {
	listCourseOptions,
	listFacultyOptions,
} from "./list-profile-options.ts";

const makeRuleSet = (id: string, scopes?: readonly RuleSetScope[]): RuleSet =>
	({
		metadata: {
			id,
			displayName: id,
			sourceRevision: "",
			applicableTo: () => true,
			specificity: 100,
			...(scopes === undefined ? {} : { applicableScopes: scopes }),
		},
	}) as unknown as RuleSet;

// 3 つの scope を持つ registry をテスト全体で使い回す
const registry = createRegistry([
	makeRuleSet("a", [
		{ faculty: "人文社会科学部", course: "人文科学コース" },
		{ faculty: "人文社会科学部", course: "社会科学コース" },
	]),
	makeRuleSet("b", [
		{ faculty: "法学部", course: "法律コース" },
		{ faculty: "法学部", course: "政治コース" },
	]),
	makeRuleSet("c", [
		// faculty は重複するが scope は別（重複除去をテストするため）
		{ faculty: "人文社会科学部", course: "人文科学コース" },
	]),
]);

describe("listFacultyOptions", () => {
	it("course filter 未指定ならば全学部を返す（重複除去・初出順）", () => {
		expect(listFacultyOptions(registry)).toStrictEqual([
			"人文社会科学部",
			"法学部",
		]);
	});

	it("course filter を指定すると、そのコースを含む学部に絞る", () => {
		expect(
			listFacultyOptions(registry, { course: "法律コース" }),
		).toStrictEqual(["法学部"]);
	});

	it("複数学部に跨るコース（今はないが理論的にあり得る）の場合、全学部を返す", () => {
		const multiScope = createRegistry([
			makeRuleSet("x", [
				{ faculty: "人文社会科学部", course: "共通コース" },
				{ faculty: "法学部", course: "共通コース" },
			]),
		]);
		expect(
			listFacultyOptions(multiScope, { course: "共通コース" }),
		).toStrictEqual(["人文社会科学部", "法学部"]);
	});

	it("course を空文字列で渡した場合は未指定と同じ（絞らない）", () => {
		expect(listFacultyOptions(registry, { course: "" })).toStrictEqual([
			"人文社会科学部",
			"法学部",
		]);
	});

	it("存在しないコースで絞ると空配列", () => {
		expect(
			listFacultyOptions(registry, { course: "存在しないコース" }),
		).toStrictEqual([]);
	});

	it("applicableScopes を持たない ruleset は無視", () => {
		const r = createRegistry([
			makeRuleSet("empty"),
			makeRuleSet("withScope", [
				{ faculty: "人文社会科学部", course: "人文科学コース" },
			]),
		]);
		expect(listFacultyOptions(r)).toStrictEqual(["人文社会科学部"]);
	});
});

describe("listCourseOptions", () => {
	it("faculty filter 未指定ならば全コースを返す（重複除去・初出順）", () => {
		expect(listCourseOptions(registry)).toStrictEqual([
			"人文科学コース",
			"社会科学コース",
			"法律コース",
			"政治コース",
		]);
	});

	it("faculty filter を指定すると、その学部のコースに絞る", () => {
		expect(
			listCourseOptions(registry, { faculty: "人文社会科学部" }),
		).toStrictEqual(["人文科学コース", "社会科学コース"]);
		expect(listCourseOptions(registry, { faculty: "法学部" })).toStrictEqual([
			"法律コース",
			"政治コース",
		]);
	});

	it("faculty を空文字列で渡した場合は未指定と同じ（絞らない）", () => {
		expect(listCourseOptions(registry, { faculty: "" })).toStrictEqual([
			"人文科学コース",
			"社会科学コース",
			"法律コース",
			"政治コース",
		]);
	});

	it("存在しない学部で絞ると空配列", () => {
		expect(listCourseOptions(registry, { faculty: "医学部" })).toStrictEqual(
			[],
		);
	});

	it("applicableScopes を持たない ruleset は無視", () => {
		const r = createRegistry([
			makeRuleSet("empty"),
			makeRuleSet("withScope", [
				{ faculty: "人文社会科学部", course: "人文科学コース" },
			]),
		]);
		expect(listCourseOptions(r)).toStrictEqual(["人文科学コース"]);
	});
});
