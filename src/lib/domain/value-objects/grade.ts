export const Grade = {
	Shu: "秀",
	Yu: "優",
	Ryo: "良",
	Ka: "可",
	Fuka: "不可",
	Nintei: "認定",
	Torikeshi: "取消",
	Hoki: "放棄",
	Unknown: "不明",
} as const;

export type Grade = (typeof Grade)[keyof typeof Grade];

const PASSING_GRADES: ReadonlySet<Grade> = new Set([
	Grade.Shu,
	Grade.Yu,
	Grade.Ryo,
	Grade.Ka,
	Grade.Nintei,
]);

export const isPassing = (g: Grade): boolean => PASSING_GRADES.has(g);

const ALIASES: ReadonlyMap<string, Grade> = new Map([
	["秀", Grade.Shu],
	["s", Grade.Shu],
	["a+", Grade.Shu],
	["ap", Grade.Shu],
	["優", Grade.Yu],
	["a", Grade.Yu],
	["良", Grade.Ryo],
	["b", Grade.Ryo],
	["可", Grade.Ka],
	["c", Grade.Ka],
	["不可", Grade.Fuka],
	["f", Grade.Fuka],
	["d", Grade.Fuka],
	["認定", Grade.Nintei],
	["p", Grade.Nintei],
	["pass", Grade.Nintei],
	["取消", Grade.Torikeshi],
	["履修取消", Grade.Torikeshi],
	["w", Grade.Torikeshi],
	["放棄", Grade.Hoki],
	["履修放棄", Grade.Hoki],
]);

export const parseGrade = (raw: string): Grade => {
	const trimmed = raw.trim();
	if (trimmed === "") return Grade.Unknown;
	const mapped = ALIASES.get(trimmed) ?? ALIASES.get(trimmed.toLowerCase());
	return mapped ?? Grade.Unknown;
};
