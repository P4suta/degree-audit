import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * design-lint: assert no hardcoded design values leak into the Svelte layer.
 *
 * The single source of truth is the `@theme` tokens + `@utility` scale in
 * src/routes/layout.css. Components reference them through semantic utilities or
 * the `[color:var(--color-*)]` / `[var(--radius-*)]` / `[var(--shadow-*)]` token
 * forms — never a raw hex, rgba, px font size, magic size, or z-number. A drift
 * fails the build here, where the compiler and unit tests can't see it.
 *
 * Add new components to SVELTE_FILES.
 */

const SRC = path.resolve(__dirname, "..");
const CSS = path.join(SRC, "routes/layout.css");

const SVELTE_FILES = [
	"lib/presentation/components/CourseList.svelte",
	"lib/presentation/components/ErrorBanner.svelte",
	"lib/presentation/components/ProgressBar.svelte",
	"lib/presentation/components/RequirementCard.svelte",
	"lib/presentation/components/Summary.svelte",
	"lib/presentation/components/TranscriptDropZone.svelte",
	"lib/presentation/components/WarningBanner.svelte",
	"lib/presentation/ui/Alert.svelte",
	"lib/presentation/ui/Badge.svelte",
	"lib/presentation/ui/Button.svelte",
	"lib/presentation/ui/Card.svelte",
	"lib/presentation/ui/Input.svelte",
	"lib/presentation/ui/Progress.svelte",
	"lib/presentation/ui/Select.svelte",
	"routes/+layout.svelte",
	"routes/+page.svelte",
	"routes/dashboard/+page.svelte",
	"routes/disclaimer/+page.svelte",
	"routes/import/+page.svelte",
	"routes/profile/+page.svelte",
	"routes/requirements/[id]/+page.svelte",
	// components/Disclaimer.svelte is added in the native-<dialog> conversion PR,
	// once its overlay/backdrop move to layout.css tokens.
];

/**
 * Only class values should be linted. Strip inline `style="…"` (dynamic colours
 * are exempt) and comments — block, HTML, and full-line `//` — so prose that
 * happens to mention `text-base` or `min-h-[44px]` isn't a false positive. Class
 * strings assembled in `<script>` (e.g. Button's size map) are kept.
 */
function scrub(content: string): string {
	// Blank matched spans to spaces (keeping newlines) so reported line numbers
	// stay accurate.
	const blank = (m: string) => m.replace(/[^\n]/g, " ");
	return content
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/^\s*\/\/.*$/gm, blank)
		.replace(/style="[^"]*"/g, blank);
}

/** Each rule is [regex, description, allow-pattern?]; allow-matching lines skip. */
const RULES: [RegExp, string, RegExp?][] = [
	// --- Colours: tokens only, never a raw hex / rgba / default palette ---
	[/\[#[0-9a-fA-F]{3,8}\]/, "Arbitrary hex colour (use a --color-* token)"],
	[/\[rgba?\(/, "Raw rgba/rgb colour (use a --color-* token)"],
	[
		/(?:text|bg|border|ring)-(?:gray|slate|zinc|neutral|stone|blue|red|green|amber|yellow|orange)-\d/,
		"Tailwind default palette (use --color-* tokens)",
	],

	// --- Radius: the token form rounded-[var(--radius-*)] only ---
	[
		/rounded-\[/,
		"Arbitrary radius (use rounded-[var(--radius-*)])",
		/rounded-\[var\(--radius-/,
	],

	// --- Arbitrary size / spacing / position: a scale step or named @utility ---
	[
		/\b(?:min-h|max-h|min-w|max-w|w|h|gap|p[xytblr]?|m[xytblr]?|top|left|right|bottom|inset|leading|size)-\[/,
		"Arbitrary size/spacing (use the scale or a named @utility: min-h-tap / max-w-readable)",
		/-\[var\(--/,
	],
	[/\bz-\d/, "Raw z-index (use a named rung: z-nav)"],
	[/\bz-\[/, "Arbitrary z-index (use a named rung: z-nav)"],

	// --- Font sizes: the @utility type scale, never raw Tailwind sizes ---
	[
		/text-\[\d+px\]/,
		"Arbitrary font size (use text-caption / -small / -body / -h3… or text-form)",
	],
	[
		/\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/,
		"Raw Tailwind font size (use the scale: text-micro … text-display / text-form)",
	],

	// --- Font weight: normal / medium / semibold only (DESIGN.md §1) ---
	[
		/\bfont-(?:bold|extrabold|black|thin|light)\b/,
		"Off-scale font weight (use font-normal / font-medium / font-semibold)",
	],

	// --- Shadows / easing: the token forms only ---
	[
		/shadow-\[/,
		"Arbitrary shadow (use shadow-[var(--shadow-*)])",
		/shadow-\[var\(--shadow-/,
	],
	[/ease-\[cubic-bezier/, "Arbitrary easing (use an --ease-* token)"],
];

function findViolations(filePath: string): string[] {
	const violations: string[] = [];
	scrub(fs.readFileSync(filePath, "utf-8"))
		.split("\n")
		.forEach((line, i) => {
			for (const [pattern, message, allow] of RULES) {
				if (pattern.test(line) && !allow?.test(line)) {
					violations.push(
						`  ${path.basename(filePath)}:${i + 1} — ${message}\n    ${line.trim()}`,
					);
				}
			}
		});
	return violations;
}

describe("design token enforcement", () => {
	it("all listed Svelte files exist", () => {
		for (const file of SVELTE_FILES) {
			expect(fs.existsSync(path.join(SRC, file)), `Missing: ${file}`).toBe(
				true,
			);
		}
	});

	it("the lint rules catch known violations and pass canonical usage", () => {
		// Guards the linter itself: a typo that makes a rule a no-op would let real
		// drift through. Every bad string must trip a rule; every canonical one none.
		const caught = (s: string) =>
			RULES.some(([re, , allow]) => re.test(s) && !allow?.test(s));
		const bad = [
			"text-lg",
			"text-xl",
			"text-sm",
			"text-xs",
			"text-base",
			"text-[13px]",
			"font-bold",
			"font-light",
			"bg-[#ffffff]",
			"bg-[rgba(0,0,0,0.45)]",
			"text-gray-500",
			"text-blue-600",
			"min-h-[44px]",
			"max-w-[640px]",
			"z-30",
			"z-[200]",
			"gap-[2px]",
			"shadow-[0_1px_2px]",
			"rounded-[7px]",
			"ease-[cubic-bezier(0,0,1,1)]",
		];
		for (const s of bad) expect(caught(s), `rule missed: ${s}`).toBe(true);
		const good = [
			"text-body",
			"text-caption",
			"text-small",
			"text-form",
			"text-display",
			"text-h1",
			"text-h2",
			"font-normal",
			"font-medium",
			"font-semibold",
			"text-[color:var(--color-fg)]",
			"bg-[color:var(--color-accent)]",
			"border-[color:var(--color-border)]",
			"rounded-[var(--radius-md)]",
			"rounded-[var(--radius-pill)]",
			"shadow-[var(--shadow-card)]",
			"min-h-tap",
			"max-w-readable",
			"min-h-8",
			"max-w-2xl",
			"z-nav",
		];
		for (const s of good) expect(caught(s), `false positive: ${s}`).toBe(false);
	});

	it("layout.css defines the core token categories", () => {
		const css = fs.readFileSync(CSS, "utf-8");
		const required = [
			"--color-background",
			"--color-surface",
			"--color-surface-glass",
			"--color-fg",
			"--color-fg-muted",
			"--color-fg-subtle",
			"--color-accent",
			"--color-accent-link",
			"--color-accent-fg",
			"--color-success-fg",
			"--color-warning-fg",
			"--color-danger-fg",
			"--radius-md",
			"--radius-pill",
			"--shadow-card",
			"--font-sans",
		];
		for (const t of required)
			expect(css, `missing token ${t}`).toContain(`${t}:`);
	});

	for (const file of SVELTE_FILES) {
		it(`${file} has no hardcoded design values`, () => {
			const violations = findViolations(path.join(SRC, file));
			if (violations.length > 0) {
				expect.fail(
					`Found ${violations.length} hardcoded value(s):\n${violations.join("\n")}`,
				);
			}
		});
	}
});
