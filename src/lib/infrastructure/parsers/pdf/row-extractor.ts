import { matchKey } from "../../../domain/text/normalize.ts";
import type { RawCourse } from "../transcript-parser.ts";
import type { PdfPage, PositionedTextItem } from "./text-extractor.ts";

/**
 * 高知大学「個別成績表」PDF のレイアウトに合わせた座標ベースの表再構成。
 *
 * レイアウト前提（A4 縦、pdfjs-dist の bottom-left 原点）：
 *   - 2 段組み。左カラム（x < 300）と右カラム（x >= 300）でそれぞれ
 *     独立した科目行が並ぶ
 *   - 列のヘッダ行は y ≈ 699、データ領域は y ≈ 170 〜 697
 *   - y ≈ 170 未満は「基準単位・履修単位・修得単位」集計と凡例のため除外
 *   - y > 697 は学生情報ブロックとタイトルのため除外
 *   - セクションマーカーは左カラムに現れて以降の行の区分を決める
 *     （ページをまたいでも状態は継続）
 *
 * 科目が少ない場合は 1 ページで完結する。多い場合は複数ページに分かれる。
 * ヘッダ / 集計領域はページごとに繰り返されるので、y 範囲で毎ページ弾く。
 */

const DATA_AREA_TOP_Y = 697; // 列ヘッダの直下まで有効
const DATA_AREA_BOTTOM_Y = 170; // 集計領域の直上まで有効
const COLUMN_SPLIT_X = 300;

// 同じ視覚行とみなす y の許容差（小数点以下ある場合に備えて 3 pt）
const ROW_Y_TOLERANCE = 3;

// 各フィールドの x 開始境界（nearest-field 割り当て用）
const LEFT_FIELDS = [
	{ key: "name", xMin: 0, xMax: 175 },
	{ key: "teacher", xMin: 175, xMax: 225 },
	{ key: "credit", xMin: 225, xMax: 240 },
	{ key: "score", xMin: 240, xMax: 258 },
	{ key: "grade", xMin: 258, xMax: 278 },
	{ key: "year", xMin: 278, xMax: 294 },
	{ key: "sem", xMin: 294, xMax: COLUMN_SPLIT_X },
] as const;

const RIGHT_FIELDS = [
	{ key: "name", xMin: COLUMN_SPLIT_X, xMax: 418 },
	{ key: "teacher", xMin: 418, xMax: 465 },
	{ key: "credit", xMin: 465, xMax: 485 },
	{ key: "score", xMin: 485, xMax: 502 },
	{ key: "grade", xMin: 502, xMax: 520 },
	{ key: "year", xMin: 520, xMax: 538 },
	{ key: "sem", xMin: 538, xMax: 9999 },
] as const;

type FieldKey = (typeof LEFT_FIELDS)[number]["key"];

interface CellAccumulator {
	name: string;
	teacher: string;
	credit: string;
	score: string;
	grade: string;
	year: string;
	sem: string;
}

interface SectionState {
	top?: string; // [...]
	mid?: string; // 《...》
	leaf?: string; // 〈...〉
}

const emptyCells = (): CellAccumulator => ({
	name: "",
	teacher: "",
	credit: "",
	score: "",
	grade: "",
	year: "",
	sem: "",
});

const fieldAt = (
	x: number,
	fields: readonly { key: FieldKey; xMin: number; xMax: number }[],
): FieldKey | undefined => {
	for (const f of fields) {
		if (x >= f.xMin && x < f.xMax) return f.key;
	}
	return undefined;
};

/**
 * y 座標で降順にソートした items を、視覚行ごとにグループ化する。
 * 同じ行とみなす y 許容差は `ROW_Y_TOLERANCE`。
 */
const groupByRow = (
	items: readonly PositionedTextItem[],
): readonly (readonly PositionedTextItem[])[] => {
	const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
	const rows: PositionedTextItem[][] = [];
	let current: PositionedTextItem[] | null = null;
	let currentTopY = Number.POSITIVE_INFINITY;
	for (const item of sorted) {
		if (current === null || currentTopY - item.y > ROW_Y_TOLERANCE) {
			current = [item];
			rows.push(current);
			currentTopY = item.y;
		} else {
			current.push(item);
		}
	}
	// 各行内で x 昇順に並べ直す
	for (const row of rows) row.sort((a, b) => a.x - b.x);
	return rows;
};

/**
 * 指定した列のアイテム群だけを y 降順でグループ化し、1 カラム分の論理的な
 * 行列を返す。左カラムを読み切ってから右カラムへ進むという PDF の読み順を
 * 表現するため、左右は別個に処理する。
 */
const processColumn = (
	items: readonly PositionedTextItem[],
	fields: readonly { key: FieldKey; xMin: number; xMax: number }[],
	initialState: SectionState,
	sink: (course: RawCourse) => void,
): SectionState => {
	let state = initialState;
	const rows = groupByRow(items);
	for (const row of rows) {
		const cells = assignToCells(row, fields);
		const result = processHalfRow(cells, state);
		state = result.nextState;
		if (result.course !== undefined) sink(result.course);
	}
	return state;
};

const assignToCells = (
	rowItems: readonly PositionedTextItem[],
	fields: readonly { key: FieldKey; xMin: number; xMax: number }[],
): CellAccumulator => {
	const cells = emptyCells();
	for (const item of rowItems) {
		const field = fieldAt(item.x, fields);
		if (field === undefined) continue;
		// 空白のみは無視（セパレータとして描画されることがある）
		const trimmed = item.str.trim();
		if (trimmed === "") continue;
		cells[field] = cells[field] === "" ? trimmed : `${cells[field]}${trimmed}`;
	}
	return cells;
};

interface SectionMatch {
	readonly level: "top" | "mid" | "leaf";
	readonly value: string;
}

const TOP_RE = /^\[(.+)\]$/;
const BRACE_RE = /^《(.+)》$/;
const ANGLE_RE = /^〈(.+)〉$/;

/**
 * 《》 で括られる名前は構造的に「mid」か「leaf」か判別できないので、
 * Kochi 令和 4〜5 年度の成績表で mid レベルとして出てくる名前を列挙し、
 * それ以外の 《》 は leaf として扱う。
 * 〈〉 は常に leaf。
 */
const MID_BRACE_NAMES: ReadonlySet<string> = new Set([
	"初年次科目",
	"教養科目",
	"プラットフォーム科目",
	"ゼミナール科目",
	"選択科目",
]);

const detectSectionMarker = (nameCell: string): SectionMatch | undefined => {
	const stripped = nameCell.replace(/[\s　]+/g, "");
	const top = TOP_RE.exec(stripped);
	if (top !== null) return { level: "top", value: top[1] ?? "" };
	const brace = BRACE_RE.exec(stripped);
	if (brace !== null) {
		const value = brace[1] ?? "";
		const level = MID_BRACE_NAMES.has(value) ? "mid" : "leaf";
		return { level, value };
	}
	const angle = ANGLE_RE.exec(stripped);
	if (angle !== null) return { level: "leaf", value: angle[1] ?? "" };
	return undefined;
};

const applySectionMarker = (
	state: SectionState,
	match: SectionMatch,
): SectionState => {
	switch (match.level) {
		case "top":
			return { top: match.value };
		case "mid":
			return { top: state.top, mid: match.value };
		case "leaf":
			return { top: state.top, mid: state.mid, leaf: match.value };
	}
};

const buildRawLabel = (state: SectionState): string => {
	const parts = [state.top, state.mid, state.leaf].filter(
		(v): v is string => v !== undefined && v !== "",
	);
	return parts.join(" / ");
};

/**
 * 1 つの「列セル（左または右）」を処理し、section state を更新しながら
 * 課程行が成立したときだけ RawCourse を返す。
 */
const processHalfRow = (
	cells: CellAccumulator,
	state: SectionState,
): { nextState: SectionState; course?: RawCourse } => {
	if (cells.name === "") return { nextState: state };

	const marker = detectSectionMarker(cells.name);
	if (marker !== undefined) {
		return { nextState: applySectionMarker(state, marker) };
	}

	// 科目行の判定：単位セルが空なら course ではない（section header でもない
	// 空行 / 枠線等の残滓）として捨てる
	if (cells.credit === "") return { nextState: state };

	const course: RawCourse = {
		rawCategoryLabel: buildRawLabel(state),
		name: cells.name,
		creditText: cells.credit,
		gradeText: cells.grade,
		...(cells.year !== "" ? { yearText: cells.year } : {}),
		...(cells.teacher !== "" ? { teacher: cells.teacher } : {}),
		...(cells.score !== "" ? { scoreText: cells.score } : {}),
	};
	return { nextState: state, course };
};

/**
 * PDF 全ページを走査し、section state をページ間で継続しながら RawCourse[]
 * を積み上げる。ヘッダ（y > 697）とフッタ（y < 170）は毎ページ除外。
 *
 * 読み順は Kochi 個別成績表の 2 段組に合わせて、ページごとに
 *   「左カラム全行 → 右カラム全行」
 * の順。section state はカラムをまたぎ、ページもまたぐ。右カラムの先頭科目は
 * 左カラム末尾のセクションを受け継ぐ（例：左が《基礎科目Ｂ群》で終わると、
 * 右の先頭 4 科目は 基礎科目Ｂ群 として解釈される）。
 */
export const extractRawCoursesFromPages = (
	pages: readonly PdfPage[],
): readonly RawCourse[] => {
	let sectionState: SectionState = {};
	const courses: RawCourse[] = [];
	const sink = (c: RawCourse) => {
		courses.push(c);
	};

	for (const page of pages) {
		const dataItems = page.items.filter(
			(it) => it.y < DATA_AREA_TOP_Y && it.y > DATA_AREA_BOTTOM_Y,
		);
		const leftItems = dataItems.filter((it) => it.x < COLUMN_SPLIT_X);
		const rightItems = dataItems.filter((it) => it.x >= COLUMN_SPLIT_X);

		sectionState = processColumn(leftItems, LEFT_FIELDS, sectionState, sink);
		sectionState = processColumn(rightItems, RIGHT_FIELDS, sectionState, sink);
	}

	return courses;
};

// 将来のデバッグ用に公開。category-map / raw-to-course に渡す前の形を
// 確認するのに便利。
export const _internal = {
	groupByRow,
	assignToCells,
	detectSectionMarker,
	applySectionMarker,
	buildRawLabel,
	LEFT_FIELDS,
	RIGHT_FIELDS,
	matchKey,
};
