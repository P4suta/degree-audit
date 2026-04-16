import type { Course } from "../entities/course.ts";

export interface SpecResult {
	readonly satisfied: boolean;
	readonly required: number;
	readonly actual: number;
	readonly contributingCourses: readonly Course[];
	readonly subResults: readonly SpecResult[];
	readonly diagnostics: readonly string[];
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
