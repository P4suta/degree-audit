import type { Course } from "../../entities/course.ts";
import {
	type EvalContext,
	type Specification,
	type SpecResult,
	totalCredits,
} from "../types.ts";

/**
 * Limits how much a sub-spec contributes to an aggregate. Courses past the cap
 * are excluded from `actual` / `contributingCourses` while still reported in
 * diagnostics. Used e.g. for キャリア形成支援 (上限 6 単位) or 他学部科目 (上限 8 単位).
 */
export const cappedContribution = (options: {
	readonly id: string;
	readonly label: string;
	readonly cap: number;
	readonly predicate: (course: Course) => boolean;
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const matching = ctx.pool.filter(options.predicate);
		const rawTotal = totalCredits(matching);
		const capped: Course[] = [];
		let accumulated = 0;
		for (const course of matching) {
			const c = course.credit as number;
			if (accumulated + c <= options.cap) {
				capped.push(course);
				accumulated += c;
			} else {
				break;
			}
		}
		const diagnostics: string[] = [
			`合算 ${accumulated} / 上限 ${options.cap} 単位`,
		];
		if (rawTotal > options.cap) {
			diagnostics.push(
				`${rawTotal - options.cap} 単位が上限超過（卒業要件には算入されません）`,
			);
		}
		return {
			satisfied: true,
			required: options.cap,
			actual: accumulated,
			contributingCourses: capped,
			subResults: [],
			diagnostics,
		};
	},
});
