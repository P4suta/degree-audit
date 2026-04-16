import type { LogSink } from "../log-record.ts";

export const noopSink: LogSink = {
	write: () => {
		/* intentionally empty */
	},
};
