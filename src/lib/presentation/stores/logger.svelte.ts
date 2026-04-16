import { Logger } from "../../infrastructure/logging/logger.ts";
import { ConsoleSink } from "../../infrastructure/logging/sinks/console-sink.ts";

export const logger = new Logger({
	sink: new ConsoleSink(),
	minLevel: import.meta.env.DEV ? "debug" : "info",
	baseContext: { app: "degree-audit" },
});
