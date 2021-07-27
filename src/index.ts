import { createBot } from "./bot";
import { registerSlashCommands } from "./commands";

if (process.argv.length > 2 && process.argv[2] === "--deploy-slash") {
    // We don't need to verify the bigint typing since this CLI operation will safely fail
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerSlashCommands(process.argv[3] as any);
} else {
    const bot = createBot();
    process.once("SIGTERM", () => bot.destroy());
    // Implicitly use DISCORD_TOKEN
    bot.login();
}
