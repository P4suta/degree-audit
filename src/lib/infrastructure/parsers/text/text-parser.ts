import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { err, ok, type Result } from "../../../domain/errors/result.ts";
import type { RawCourse, TranscriptParser } from "../transcript-parser.ts";
import { findSectionHint, type SectionHint } from "./section-inference.ts";

/**
 * Kochi「Web 成績 / 成績閲覧」ページからコピペしたテキストをパースする。
 *
 * 設計メモ：
 *   - `\t` が保たれた素のコピペを前提とするが、OS やブラウザの都合で
 *     タブが空白連続に変換されても動くように `\t` → `/\s{2,}/` フォールバックで split
 *   - 年度（4 桁）を landmark にして name / credit / score / grade / teacher を
 *     相対位置で抽出する（履修中で素点が空でも列数変動を吸収できる）
 *   - 部分コピペでも正しい breadcrumb（「共通教育 / 教養科目 / 人文分野」）を
 *     組み立てられるよう、セクション逆引き（`section-inference.ts`）で親を
 *     自動補完。上位セクションが明示的に出現した場合はそちらで上書き
 *   - 前後の非課程部分（「Web成績」プレ / 「修得単位計」以降）は無視
 */

/** サイズ上限。学期 10 年分でも 500KB に収まる想定。超過は即エラーで返す。 */
export const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2 MB

const GRADE_TOKENS = new Set([
	"秀",
	"優",
	"良",
	"可",
	"不可",
	"認",
	"認定",
	"履修中",
	"履",
	"取消",
	"放棄",
]);

const NECESSITY_TOKENS = new Set(["必修", "選必修", "選択", "必", "必・選"]);

const YEAR_RE = /^(19|20)\d{2}$/;
const CREDIT_RE = /^\d+(\.\d+)?$/;

/**
 * 終端マーカー：これらの語句を含む行に達したら以降を読み飛ばして終了する。
 * 凡例・集計・GPA 領域はすべて終端より下にあるので、これで十分安全。
 */
const END_MARKERS = [
	"修得単位計",
	"科目区分別修得状況",
	"GPA欄",
	"GPA 欄",
	"科目名の※",
	"科目名の★",
] as const;

const hitsEndMarker = (line: string): boolean =>
	END_MARKERS.some((m) => line.includes(m));

interface SectionState {
	top?: string;
	mid?: string;
	leaf?: string;
}

const applyHint = (_state: SectionState, hint: SectionHint): SectionState => {
	// 型レベルで hint.top / hint.mid が確定しているので defensive fallback 不要
	switch (hint.level) {
		case "top":
			return { top: hint.value };
		case "mid":
			return { top: hint.top, mid: hint.value };
		case "leaf":
			return { top: hint.top, mid: hint.mid, leaf: hint.value };
	}
};

const buildRawLabel = (state: SectionState): string => {
	const parts = [state.top, state.mid, state.leaf].filter(
		(v): v is string => v !== undefined && v !== "",
	);
	return parts.join(" / ");
};

/**
 * 1 行を split。まず `\t` で試し、5 セル未満なら `/\s{2,}/` にフォールバック。
 * 空セルは保持したいので `\t` では `split("\t")` をそのまま使う。
 */
const splitRow = (line: string): readonly string[] => {
	const tabSplit = line.split("\t");
	if (tabSplit.length >= 5) return tabSplit.map((c) => c.trim());
	// タブが保たれていないケース（OS/ブラウザによる）
	return line.trim().split(/\s{2,}/);
};

const isSectionRow = (cells: readonly string[]): boolean => {
	if (cells.length === 0) return false;
	// for..of で回すと noUncheckedIndexedAccess の undefined narrowing を
	// 回避でき、デッドブランチが生じない
	let firstSeen = false;
	for (const v of cells) {
		if (!firstSeen) {
			firstSeen = true;
			if (v === "") return false;
			continue;
		}
		if (v !== "") return false;
	}
	return true;
};

interface ParsedCourse {
	readonly raw: RawCourse;
}

/** 配列インデックスアクセスを型安全に。範囲外は "" を返す。 */
const at = (cells: readonly string[], i: number): string => cells[i] ?? "";

/**
 * 科目行パース。年度（4 桁）を landmark に、その前後から各フィールドを拾う。
 * 行が科目行の要件を満たさないときは `undefined` を返す。
 */
const parseCourseRow = (
	cells: readonly string[],
	state: SectionState,
): ParsedCourse | undefined => {
	if (cells.length < 5) return undefined;
	const yearIdx = cells.findIndex((c, i) => i > 0 && YEAR_RE.test(c));
	if (yearIdx < 3) return undefined;

	const necessity = at(cells, yearIdx - 1);
	const grade = at(cells, yearIdx - 2);
	if (!NECESSITY_TOKENS.has(necessity)) return undefined;
	if (!GRADE_TOKENS.has(grade)) return undefined;

	const name = at(cells, 0);
	const credit = at(cells, 1);
	if (name === "") return undefined;
	if (!CREDIT_RE.test(credit)) return undefined;

	// 素点は credit と grade の間（cells[2]）。空 or 非数値なら "" を返す
	const potentialScore = yearIdx - 2 > 2 ? at(cells, 2) : "";
	const score = /^\d+$/.test(potentialScore) ? potentialScore : "";

	const teacher = at(cells, yearIdx + 2);
	// yearIdx は findIndex が返したので cells[yearIdx] は必ず定義される
	const yearText = at(cells, yearIdx);

	const raw: RawCourse = {
		rawCategoryLabel: buildRawLabel(state),
		name,
		creditText: credit,
		gradeText: grade,
		yearText,
		...(teacher !== "" ? { teacher } : {}),
		...(score !== "" ? { scoreText: score } : {}),
	};
	return { raw };
};

export const parseTranscriptText = (
	source: string,
): Result<readonly RawCourse[], DomainError> => {
	const lines = source.split(/\r?\n/);
	const courses: RawCourse[] = [];
	let state: SectionState = {};

	for (const rawLine of lines) {
		const line = rawLine.replace(/\u3000/g, " ");
		if (line.trim() === "") continue;
		if (hitsEndMarker(line)) break;

		const cells = splitRow(line);
		const first = cells[0];
		if (first === undefined) continue;

		// ヘッダ行「学則科目名称 単位 ...」は無視
		if (first === "学則科目名称") continue;

		// セクション行？
		if (isSectionRow(cells)) {
			const hint = findSectionHint(first);
			if (hint !== undefined) state = applyHint(state, hint);
			// 未知セクション名は黙って無視（プレブロックの氏名行なども吸収）
			continue;
		}

		// 科目行？
		const parsed = parseCourseRow(cells, state);
		if (parsed !== undefined) courses.push(parsed.raw);
		// 該当しない行（プレブロック、統計テーブルなど）は無視
	}

	return ok(courses);
};

const assertSize = (bytes: Uint8Array): Result<Uint8Array, DomainError> => {
	if (bytes.byteLength > MAX_TEXT_BYTES) {
		return err(
			new DomainError({
				code: ErrorCode.TextSourceTooLarge,
				message: `Text source exceeds ${MAX_TEXT_BYTES} bytes (${bytes.byteLength})`,
				userMessage:
					"貼り付けられたテキストが大きすぎます。成績ページのコピーかご確認ください。",
				context: { size: bytes.byteLength, limit: MAX_TEXT_BYTES },
			}),
		);
	}
	return ok(bytes);
};

const assertSomeCourses = (
	rows: readonly RawCourse[],
): Result<readonly RawCourse[], DomainError> => {
	if (rows.length === 0) {
		return err(
			new DomainError({
				code: ErrorCode.TextNoCoursesFound,
				message: "Text parsed but no course rows were extracted",
				userMessage:
					"貼り付けられたテキストから科目の行を 1 件も読み取れませんでした。高知大学「Web 成績 / 成績閲覧」ページからコピーしたか、範囲に科目行が含まれているかご確認ください。",
			}),
		);
	}
	return ok(rows);
};

export const textParser: TranscriptParser = {
	async parse(bytes: Uint8Array) {
		const sized = assertSize(bytes);
		if (sized.ok === false) return sized;
		const source = new TextDecoder("utf-8").decode(sized.value);
		const parsed = parseTranscriptText(source);
		if (parsed.ok === false) return parsed;
		return assertSomeCourses(parsed.value);
	},
};
