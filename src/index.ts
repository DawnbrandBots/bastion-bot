import bot from "./bot";

process.once("SIGTERM", () => bot.destroy());
bot.login();
