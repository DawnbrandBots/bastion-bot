import bot from "../src/bot";

describe("Does not crash from socket events", () => {
    it("Captures warn events", () => {
        bot.emit("warn", "Sample warning");
    });
    it("Captures error evemts", () => {
        bot.emit("error", new Error("Sample"));
    });
});
