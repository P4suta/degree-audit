import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * プロジェクト全体から特定大学を示す文字列を排除するための常設ガード。
 *
 * 禁止したい文字列をソース上にリテラルで書くと、このテスト自身が違反物件に
 * なって自己 trip する。そのため、禁止文字列はすべて配列 join で組み立てる
 * （実行時には正しい文字列に合成される）。テスト名・コメント上にもリテラル
 * では出現させない。
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const FORBIDDEN_JP = ["高", "知"].join("");
const FORBIDDEN_ROMAJI = ["k", "o", "c", "h", "i"].join("");

/**
 * スキャンから外す相対パス。
 * - node_modules / .svelte-kit / build / coverage / .git: ビルド成果物・依存・VCS
 * - tests/fixtures: ユーザー個人の実成績データ（.gitignore 済み、本人私物）
 */
const EXCLUDED_PATHS: readonly string[] = [
	"node_modules",
	".svelte-kit",
	"build",
	"coverage",
	".git",
	"tests/fixtures",
];

const INCLUDE_EXT: readonly string[] = [
	".ts",
	".tsx",
	".js",
	".mjs",
	".svelte",
	".md",
	".html",
	".css",
	".json",
];

const isExcluded = (rel: string): boolean =>
	EXCLUDED_PATHS.some((ex) => rel === ex || rel.startsWith(`${ex}/`));

const walk = (dir: string, acc: string[]): void => {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const rel = relative(ROOT, full);
		if (isExcluded(rel)) continue;
		const s = statSync(full);
		if (s.isDirectory()) {
			walk(full, acc);
		} else if (INCLUDE_EXT.some((ext) => entry.endsWith(ext))) {
			acc.push(full);
		}
	}
};

interface Offense {
	readonly path: string;
	readonly lines: readonly number[];
	readonly needle: string;
}

const scan = (needle: string, caseInsensitive: boolean): Offense[] => {
	const files: string[] = [];
	walk(ROOT, files);
	const offenders: Offense[] = [];
	const needleCompare = caseInsensitive ? needle.toLowerCase() : needle;
	for (const f of files) {
		const raw = readFileSync(f, "utf-8");
		const content = caseInsensitive ? raw.toLowerCase() : raw;
		if (!content.includes(needleCompare)) continue;
		const lines: number[] = [];
		raw.split("\n").forEach((line, i) => {
			const cmp = caseInsensitive ? line.toLowerCase() : line;
			if (cmp.includes(needleCompare)) lines.push(i + 1);
		});
		offenders.push({ path: relative(ROOT, f), lines, needle });
	}
	return offenders;
};

describe("プロジェクト全体の名称スクラブ", () => {
	it(`禁止文字列（日本語 prefix "${FORBIDDEN_JP}"）を含むファイルが無い`, () => {
		const offenders = scan(FORBIDDEN_JP, false);
		expect(offenders).toEqual([]);
	});

	it(`禁止文字列（ローマ字 "${FORBIDDEN_ROMAJI}"、大小問わず）を含むファイルが無い`, () => {
		const offenders = scan(FORBIDDEN_ROMAJI, true);
		expect(offenders).toEqual([]);
	});
});
