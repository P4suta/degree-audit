import type { Course } from "../../entities/course.ts";
import type { EvalContext, Specification, SpecResult } from "../types.ts";

/**
 * 選択科目要件。leftoverPool（ゼミ超過 / PF 超過 + 他コース・他学部・自コース科目）
 * から required 単位を積み上げるが、他学部科目は otherFacultyCap を超えた分は
 * 算入しない。
 */
export const elective = (options: {
	readonly id: string;
	readonly label: string;
	readonly required: number;
	readonly otherFacultyCap: number;
}): Specification => ({
	id: options.id,
	label: options.label,
	evaluate: (ctx: EvalContext): SpecResult => {
		const otherFacultyContributing: Course[] = [];
		const otherContributing: Course[] = [];
		let otherFacultyCredits = 0;
		for (const course of ctx.pool) {
			const credit = course.credit as number;
			if (course.category.kind === "elective/other-faculty") {
				if (otherFacultyCredits + credit <= options.otherFacultyCap) {
					otherFacultyContributing.push(course);
					otherFacultyCredits += credit;
				}
			} else {
				otherContributing.push(course);
			}
		}
		const otherCredits = otherContributing.reduce(
			(sum, c) => sum + (c.credit as number),
			0,
		);
		const actual = otherCredits + otherFacultyCredits;
		const satisfied = actual >= options.required;
		const diagnostics = [
			`${actual} / ${options.required} 単位`,
			`他学部科目：${otherFacultyCredits} / ${options.otherFacultyCap} 単位`,
		];
		return {
			satisfied,
			required: options.required,
			actual,
			contributingCourses: [...otherContributing, ...otherFacultyContributing],
			subResults: [],
			diagnostics,
		};
	},
});
