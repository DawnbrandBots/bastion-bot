import { container } from "tsyringe";
import { BotFactory } from "./bot";
import { Command } from "./Command";
import { classes, registerSlashCommands } from "./commands";
import { InteractionListener, MessageListener } from "./events";
import { Metrics } from "./metrics";

if (process.argv.length > 2 && process.argv[2] === "--deploy-slash") {
	// We don't need to verify the bigint typing since this CLI operation will safely fail
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	registerSlashCommands(process.argv[3] as any);
} else {
	//container.registerSingleton<Metrics>(Metrics);
	classes.forEach(Class => container.register<Command>("Command", { useClass: Class }));
	container.register<InteractionListener>("Listener", { useClass: InteractionListener });
	container.register<MessageListener>("Listener", { useClass: MessageListener });
	//container.register<BotFactory>(BotFactory, { useClass: BotFactory });

	const bot = container.resolve(BotFactory).createInstance();
	process.once("SIGTERM", () => {
		bot.destroy();
		container.resolve(Metrics).destroy();
	});
	// Implicitly use DISCORD_TOKEN
	bot.login();
}
