export const Grade = {
	Shu: "秀",
	Yu: "優",
	Ryo: "良",
	Ka: "可",
	Fuka: "不可",
	Nintei: "認定",
	Torikeshi: "取消",
	Hoki: "放棄",
	/** In progress: grade pending. Not counted toward graduation yet, but a future candidate. */
	Risyuchu: "履修中",
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

const IN_PROGRESS_GRADES: ReadonlySet<Grade> = new Set([Grade.Risyuchu]);

export const isPassing = (g: Grade): boolean => PASSING_GRADES.has(g);

/**
 * Whether the grade is in progress (awaiting end-of-term evaluation): neither
 * passing nor failing. Not counted toward graduation yet, but shown separately
 * in the UI as a candidate that counts once passed.
 */
export const isInProgress = (g: Grade): boolean => IN_PROGRESS_GRADES.has(g);
