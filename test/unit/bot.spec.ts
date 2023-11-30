import { BotFactory } from "../../src/bot";

describe("Does not crash from socket events", () => {
	const bot = new BotFactory([]).createInstance();
	it("Captures warn events", () => {
		bot.emit("warn", "Sample warning");
	});
	it("Captures error evemts", () => {
		bot.emit("error", new Error("Sample"));
	});
});
