export const LogLevel = {
	Debug: "debug",
	Info: "info",
	Warn: "warn",
	Error: "error",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

export const isLevelEnabled = (target: LogLevel, minimum: LogLevel): boolean =>
	LOG_LEVEL_PRIORITY[target] >= LOG_LEVEL_PRIORITY[minimum];
