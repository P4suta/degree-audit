import { describe, expect, it } from "vitest";
import { ErrorCode } from "../errors/error-code.ts";
import { hasCode } from "../errors/guards.ts";
import { CourseId } from "./course-id.ts";

describe("CourseId", () => {
	it("of wraps a non-empty string", () => {
		const id = CourseId.of("K81001");
		expect(CourseId.toString(id)).toBe("K81001");
	});

	it("of trims whitespace", () => {
		expect(CourseId.toString(CourseId.of("  ABC  "))).toBe("ABC");
	});

	it("of rejects empty / whitespace-only strings with CourseIdEmpty", () => {
		for (const bad of ["", "  ", "\t\n"]) {
			try {
				CourseId.of(bad);
				expect.unreachable("should have thrown");
			} catch (e) {
				expect(hasCode(e, ErrorCode.CourseIdEmpty)).toBe(true);
				if (hasCode(e, ErrorCode.CourseIdEmpty)) {
					expect(e.context).toEqual({ value: bad });
				}
			}
		}
	});

	it("toString is an identity projection to string", () => {
		expect(CourseId.toString(CourseId.of("x"))).toBe("x");
	});
});
