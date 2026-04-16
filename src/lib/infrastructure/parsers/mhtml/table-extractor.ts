// @vitest-environment happy-dom
import { DomainError } from "../../../domain/errors/domain-error.ts";
import { ErrorCode } from "../../../domain/errors/error-code.ts";
import { err, ok, type Result } from "../../../domain/errors/result.ts";
import { canonicalize } from "../../../domain/text/normalize.ts";
import type { RawCourse } from "../transcript-parser.ts";

interface HeaderLayout {
	readonly name: number;
	readonly credit: number;
	readonly grade: number;
	readonly year?: number;
	readonly teacher?: number;
	readonly score?: number;
	readonly courseCode?: number;
}

const NAME_KEYS = ["学則科目名称", "科目名", "授業科目", "履修科目"];
const CREDIT_KEYS = ["単位数", "単位"];
const GRADE_KEYS = ["評価", "成績", "評語"];
const YEAR_KEYS = ["成績 確定年度", "確定年度", "履修年度", "年度"];
const TEACHER_KEYS = ["教員名称", "担当教員", "教員"];
const SCORE_KEYS = ["素点", "評点", "得点"];
const COURSE_CODE_KEYS = ["時間割コード", "科目コード"];

const textOf = (cell: Element | undefined): string => {
	if (cell === undefined) return "";
	return canonicalize(cell.textContent as string)
		.replace(/\s+/g, " ")
		.trim();
};

const findColumn = (
	headers: readonly string[],
	candidates: readonly string[],
): number => {
	for (const candidate of candidates) {
		for (const [i, header] of headers.entries()) {
			const normalized = header.replace(/\s+/g, "");
			if (normalized.includes(candidate.replace(/\s+/g, ""))) {
				return i;
			}
		}
	}
	return -1;
};

const layoutFor = (headers: readonly string[]): HeaderLayout | undefined => {
	const name = findColumn(headers, NAME_KEYS);
	const credit = findColumn(headers, CREDIT_KEYS);
	const grade = findColumn(headers, GRADE_KEYS);
	if (name === -1 || credit === -1 || grade === -1) return undefined;
	const year = findColumn(headers, YEAR_KEYS);
	const teacher = findColumn(headers, TEACHER_KEYS);
	const score = findColumn(headers, SCORE_KEYS);
	const courseCode = findColumn(headers, COURSE_CODE_KEYS);
	return {
		name,
		credit,
		grade,
		...(year !== -1 ? { year } : {}),
		...(teacher !== -1 ? { teacher } : {}),
		...(score !== -1 ? { score } : {}),
		...(courseCode !== -1 ? { courseCode } : {}),
	};
};

/**
 * カテゴリ階層のスロット分類。高知大学の成績閲覧テーブルでは、各セクションの
 * header row（credit 列が空で最初のセルだけ値がある行）がカテゴリを 3 階層で
 * 運ぶ：
 *   section  : 共通教育 / 専門教育 / ゼミナール / 選択科目 ...
 *   mid      : 初年次科目 / 教養科目 / プラット科目 ...
 *   leaf     : 人文分野 / 基礎 A 群 / ゼミ I・II ...
 *
 * slot 判定は既知のトークン集合との前方・部分一致で行い、未知のトークンは
 * leaf 扱いに落とす。
 */
const SECTION_TOKENS = [
	"共通教育",
	"専門教育",
	"ゼミナール",
	"選択科目",
	"修得単位計",
] as const;

const MID_TOKENS = [
	"初年次科目",
	"教養科目",
	"プラットフォーム科目",
	"プラット科目",
	"プラット",
	"専門科目",
	"他コース",
	"他学部",
	"教職",
	"任意履修",
] as const;

type Slot = "section" | "mid" | "leaf";

const classifySlot = (label: string): Slot => {
	for (const token of SECTION_TOKENS) {
		if (label === token || label.startsWith(token)) return "section";
	}
	for (const token of MID_TOKENS) {
		if (label === token || label.includes(token)) return "mid";
	}
	return "leaf";
};

interface Breadcrumb {
	section: string;
	mid: string;
	leaf: string;
}

const emptyBreadcrumb = (): Breadcrumb => ({ section: "", mid: "", leaf: "" });

const updateBreadcrumb = (bc: Breadcrumb, label: string): Breadcrumb => {
	switch (classifySlot(label)) {
		case "section":
			return { section: label, mid: "", leaf: "" };
		case "mid":
			return { section: bc.section, mid: label, leaf: "" };
		case "leaf":
			return { section: bc.section, mid: bc.mid, leaf: label };
	}
};

const breadcrumbToLabel = (bc: Breadcrumb): string =>
	[bc.section, bc.mid, bc.leaf].filter((s) => s !== "").join(" / ");

const SUMMARY_NAMES = new Set(["修得単位計", "合計", "小計", "総計"]);

const extractRow = (
	cells: readonly HTMLTableCellElement[],
	layout: HeaderLayout,
	breadcrumb: Breadcrumb,
): RawCourse | undefined => {
	const name = textOf(cells[layout.name]);
	const creditText = textOf(cells[layout.credit]);
	const gradeText = textOf(cells[layout.grade]);
	if (name === "" || creditText === "") return undefined;
	if (SUMMARY_NAMES.has(name)) return undefined;
	const rawCategoryLabel = breadcrumbToLabel(breadcrumb) || name;
	const base: RawCourse = { rawCategoryLabel, name, creditText, gradeText };
	const year = layout.year !== undefined ? textOf(cells[layout.year]) : "";
	const teacher =
		layout.teacher !== undefined ? textOf(cells[layout.teacher]) : "";
	const score = layout.score !== undefined ? textOf(cells[layout.score]) : "";
	const courseCode =
		layout.courseCode !== undefined ? textOf(cells[layout.courseCode]) : "";
	return {
		...base,
		...(year !== "" ? { yearText: year } : {}),
		...(teacher !== "" ? { teacher } : {}),
		...(score !== "" ? { scoreText: score } : {}),
		...(courseCode !== "" ? { courseCode } : {}),
	};
};

const isHeaderRow = (
	cells: readonly HTMLTableCellElement[],
	layout: HeaderLayout,
): boolean => {
	const firstText = textOf(cells[0]);
	const creditText = textOf(cells[layout.credit]);
	return firstText !== "" && creditText === "";
};

const headerTextsOf = (row: HTMLTableRowElement): readonly string[] =>
	Array.from(row.cells).map((c) => textOf(c));

/**
 * テーブル抽出には不要な <link>/<script>/<style>/<svg>/<img>/<picture>/<audio>/<video>/<meta>
 * を、DOMParser に渡す前に正規表現で除去する。happy-dom が CSS を fetch しようとする
 * ノイズを減らし、解析時間も短縮する。
 */
const NOISE_TAGS_RE =
	/<(link|script|style|svg|img|picture|audio|video|meta|iframe|noscript|canvas|object|embed)\b[^>]*(?:\/>|>[\s\S]*?<\/\1\s*>)/gi;

const stripNoise = (html: string): string => html.replace(NOISE_TAGS_RE, "");

export const extractRawCoursesFromHtml = (
	html: string,
): Result<readonly RawCourse[], DomainError> => {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(stripNoise(html), "text/html");
		const tables = Array.from(doc.querySelectorAll("table"));
		const collected: RawCourse[] = [];
		const seen = new Set<string>();
		for (const table of tables) {
			const trs = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr"));
			const [headerRow, ...dataRows] = trs;
			if (headerRow === undefined) continue;
			const layout = layoutFor(headerTextsOf(headerRow));
			if (!layout) continue;
			let breadcrumb = emptyBreadcrumb();
			for (const row of dataRows) {
				const cells = Array.from(row.cells);
				if (isHeaderRow(cells, layout)) {
					breadcrumb = updateBreadcrumb(breadcrumb, textOf(cells[0]));
					continue;
				}
				const raw = extractRow(cells, layout, breadcrumb);
				if (!raw) continue;
				const key = `${raw.name}::${raw.creditText}::${raw.gradeText}::${raw.yearText ?? ""}`;
				if (seen.has(key)) continue;
				seen.add(key);
				collected.push(raw);
			}
		}
		return ok(collected);
	} catch (cause) {
		return err(
			new DomainError({
				code: ErrorCode.MhtmlTableExtractionFailed,
				message: "Failed to parse HTML for table extraction",
				userMessage: "成績表の HTML 解析に失敗しました。",
				cause,
			}),
		);
	}
};
