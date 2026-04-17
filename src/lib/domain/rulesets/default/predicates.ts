import type { Course } from "../../entities/course.ts";
import { matchKey } from "../../text/normalize.ts";

const SPORTS_NAME_KEYS = [
	matchKey("スポーツ科学講義"),
	matchKey("スポーツ科学実技"),
];
const SPORTS_LABEL_KEY = matchKey("スポーツ科学");

/**
 * 「スポーツ科学講義」「スポーツ科学実技」を検出する述語。
 * 教養 28 単位計への算入上限（4 単位）を適用するのに使う。
 * 科目名・rawCategoryLabel の両面から matchKey で突合することで、
 * 全角/半角や装飾記号の揺れに耐える。
 */
export const isSportsScience = (course: Course): boolean => {
	const nameKey = matchKey(course.name);
	if (SPORTS_NAME_KEYS.some((key) => nameKey.includes(key))) return true;
	const labelKey = matchKey(course.rawCategoryLabel);
	return labelKey.includes(SPORTS_LABEL_KEY);
};
