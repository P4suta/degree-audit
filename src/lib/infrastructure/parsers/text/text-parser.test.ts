import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../domain/errors/result.ts";
import { parseTranscriptText, textParser } from "./text-parser.ts";

const enc = new TextEncoder();
const TAB = "\t";

const row = (...cells: readonly string[]) => cells.join(TAB);

describe("parseTranscriptText — basic rows", () => {
	it("extracts a single course with full field set", () => {
		const src = [
			"共通教育",
			"初年次科目",
			row(
				"大学基礎論 （人文社会科学部）人文科学",
				"2",
				"86",
				"優",
				"必修",
				"2022",
				"1学期",
				"田鎖 数馬, 他",
			),
		].join("\n");
		const r = parseTranscriptText(src);
		expect(isOk(r)).toBe(true);
		if (!isOk(r)) return;
		expect(r.value).toHaveLength(1);
		expect(r.value[0]).toEqual({
			rawCategoryLabel: "共通教育 / 初年次科目",
			name: "大学基礎論 （人文社会科学部）人文科学",
			creditText: "2",
			gradeText: "優",
			yearText: "2022",
			teacher: "田鎖 数馬, 他",
			scoreText: "86",
		});
	});

	it("builds 3-level breadcrumbs when liberal leaf is present", () => {
		const src = [
			"共通教育",
			"教養科目",
			"人文分野",
			row(
				"進化論の哲学",
				"2",
				"76",
				"良",
				"選択",
				"2023",
				"2学期",
				"原崎 道彦",
			),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value[0]?.rawCategoryLabel).toBe("共通教育 / 教養科目 / 人文分野");
	});

	it("handles 履修中 rows with empty 素点 when tabs preserve empty cells", () => {
		const src = [
			"専門科目",
			"ゼミナール科目",
			row(
				"卒業論文・ゼミナールⅤ・Ⅵ",
				"8",
				"",
				"履修中",
				"必修",
				"2026",
				"2学期",
				"佐野 泰之",
			),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
		expect(r.value[0]?.creditText).toBe("8");
		expect(r.value[0]?.gradeText).toBe("履修中");
		expect(r.value[0]?.scoreText).toBeUndefined();
	});

	it("handles 履修中 rows when the empty 素点 cell was collapsed to a gap", () => {
		// ブラウザコピペで空セルが欠落（列数 1 減）したケース。空白 4 個を 1 区切り扱い
		// （tab split で 5 未満なので whitespace フォールバックに落ちる想定）
		const src = [
			"専門科目",
			"ゼミナール科目",
			"卒業論文・ゼミナールⅤ・Ⅵ    8    履修中    必修    2026    2学期    佐野 泰之",
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
		expect(r.value[0]?.gradeText).toBe("履修中");
		expect(r.value[0]?.scoreText).toBeUndefined();
	});
});

describe("parseTranscriptText — section inference", () => {
	it("autofills top=共通教育 when only 教養科目 is pasted", () => {
		const src = [
			"教養科目",
			"人文分野",
			row(
				"進化論の哲学",
				"2",
				"76",
				"良",
				"選択",
				"2023",
				"2学期",
				"原崎 道彦",
			),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value[0]?.rawCategoryLabel).toBe("共通教育 / 教養科目 / 人文分野");
	});

	it("autofills top+mid when only 人文分野 leaf is pasted", () => {
		const src = [
			"人文分野",
			row(
				"進化論の哲学",
				"2",
				"76",
				"良",
				"選択",
				"2023",
				"2学期",
				"原崎 道彦",
			),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value[0]?.rawCategoryLabel).toBe("共通教育 / 教養科目 / 人文分野");
	});

	it("autofills 専門科目 top when only 選択科目 mid is pasted", () => {
		const src = [
			"選択科目",
			"他学部専門科目",
			row("会計学概論", "2", "60", "可", "選択", "2023", "1学期", "松岡 宣明"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value[0]?.rawCategoryLabel).toBe(
			"専門科目 / 選択科目 / 他学部専門科目",
		);
	});
});

describe("parseTranscriptText — noise and boundaries", () => {
	it("ignores preamble lines (student info, tab titles)", () => {
		const src = [
			"Web成績 成績閲覧",
			"",
			"国立大学法人 高知大学",
			"坂下 康信",
			"これまでの成績",
			"年度",
			"に絞り込む",
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期", "田鎖 数馬"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
		expect(r.value[0]?.name).toBe("大学基礎論");
	});

	it("stops at 修得単位計 end marker", () => {
		const src = [
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期", "田鎖"),
			row("修得単位計", "138"),
			row("ダミー科目", "2", "99", "秀", "選択", "2022", "1学期", "誰か"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
		expect(r.value[0]?.name).toBe("大学基礎論");
	});

	it("skips the column header row (学則科目名称 ...)", () => {
		const src = [
			row(
				"学則科目名称",
				"単位",
				"素点",
				"評価",
				"必選",
				"成績確定年度",
				"成績確定時期",
				"教員名称",
				"備考",
			),
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期", "田鎖"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
	});
});

describe("parseTranscriptText — rejects invalid rows", () => {
	it("rejects rows with non-numeric credit", () => {
		const src = [
			"共通教育",
			"初年次科目",
			row("ダミー", "abc", "86", "優", "必修", "2022", "1学期", "先生"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(0);
	});

	it("rejects rows with unknown grade token", () => {
		const src = [
			"共通教育",
			"初年次科目",
			row("ダミー", "2", "86", "謎", "必修", "2022", "1学期", "先生"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(0);
	});

	it("rejects rows with unknown necessity token", () => {
		const src = [
			"共通教育",
			"初年次科目",
			row("ダミー", "2", "86", "優", "不明", "2022", "1学期", "先生"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(0);
	});

	it("rejects rows with year too close to start (name ambiguity)", () => {
		const src = ["共通教育", row("2022", "12", "秀", "必修")].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(0);
	});

	it("rejects rows without any 4-digit year landmark", () => {
		const src = [
			"共通教育",
			"初年次科目",
			row("ダミー", "2", "86", "優", "必修", "abc", "1学期", "先生"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(0);
	});

	it("accepts empty input without throwing", () => {
		const r = parseTranscriptText("");
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(0);
	});

	it("tolerates rows where teacher column is missing", () => {
		// yearIdx+2 が配列長を超えるケース → teacher が "" になり、
		// 出力からは teacher フィールドが省かれる
		const src = [
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
		expect(r.value[0]?.teacher).toBeUndefined();
	});

	it("skips unknown section markers silently (e.g., preamble names)", () => {
		const src = [
			"坂下 康信",
			"これまでの成績",
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期", "田鎖"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
	});

	it("falls back to whitespace split when a row has fewer than 5 tabs", () => {
		// 全てスペース区切り（タブが 1 つも無いケース）
		const src = [
			"共通教育",
			"初年次科目",
			"大学基礎論  2  86  優  必修  2022  1学期  田鎖",
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
		expect(r.value[0]?.name).toBe("大学基礎論");
	});

	it("treats row with only 学則科目名称 header as header and skips", () => {
		const src = [
			"学則科目名称",
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期", "田鎖"),
		].join("\n");
		const r = parseTranscriptText(src);
		if (!isOk(r)) throw new Error("expected ok");
		expect(r.value).toHaveLength(1);
	});
});

describe("textParser (public TranscriptParser interface)", () => {
	it("rejects an oversized buffer", async () => {
		const big = new Uint8Array(3 * 1024 * 1024);
		const r = await textParser.parse(big);
		expect(isErr(r)).toBe(true);
	});

	it("rejects a buffer with no course rows", async () => {
		const r = await textParser.parse(enc.encode("Web成績 成績閲覧\n"));
		expect(isErr(r)).toBe(true);
	});

	it("accepts valid bytes and round-trips", async () => {
		const src = [
			"共通教育",
			"初年次科目",
			row("大学基礎論", "2", "86", "優", "必修", "2022", "1学期", "田鎖"),
		].join("\n");
		const r = await textParser.parse(enc.encode(src));
		expect(isOk(r)).toBe(true);
		if (isOk(r)) expect(r.value).toHaveLength(1);
	});
});
