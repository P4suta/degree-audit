import type { Course } from "../entities/course.ts";

export interface SpecResult {
	readonly satisfied: boolean;
	readonly required: number;
	readonly actual: number;
	readonly contributingCourses: readonly Course[];
	readonly subResults: readonly SpecResult[];
	readonly diagnostics: readonly string[];
	/**
	 * UI で `${actual} / ${required} ${unit}` と表示する時の単位名。
	 * 省略時は "単位"。`分野 / 言語 / 科目` など単位数以外をカウントする
	 * combinator は明示的に設定する。
	 */
	readonly unit?: string;
}

export interface EvalContext {
	readonly pool: readonly Course[];
}

export interface Specification {
	readonly id: string;
	readonly label: string;
	evaluate(ctx: EvalContext): SpecResult;
}

export const totalCredits = (courses: readonly Course[]): number =>
	courses.reduce((sum, c) => sum + (c.credit as number), 0);
