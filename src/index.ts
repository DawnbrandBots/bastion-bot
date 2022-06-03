import fs from "fs";
import { po } from "gettext-parser";
import os from "os";
import path from "path";
import { container } from "tsyringe";
import { addLocale } from "ttag";
import { BotFactory } from "./bot";
import { Command } from "./Command";
import { classes, registerSlashCommands } from "./commands";
import { InteractionListener, MessageListener } from "./events";
import { LocaleProvider, SQLiteLocaleProvider } from "./locale";
import { getLogger } from "./logger";
import { Metrics } from "./metrics";

if (process.argv.length > 2 && process.argv[2] === "--deploy-slash") {
	// We don't need to verify the bigint typing since this CLI operation will safely fail
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	registerSlashCommands(process.argv[3] as any);
} else {
	const logger = getLogger("index");

	const metricsDb = process.argv[2]
		? path.join(process.argv[2], "metrics.db3")
		: path.join(os.tmpdir(), "bastion-metrics.db3");
	logger.info(`Storing metrics in ${metricsDb}`);
	container.register<string>("metricsDb", {
		useValue: metricsDb
	});

	const localeDb = process.argv[2]
		? path.join(process.argv[2], "locales.db3")
		: path.join(os.tmpdir(), "bastion-locales.db3");
	logger.info(`Storing locales in ${localeDb}`);
	container.register<string>("localeDb", {
		useValue: localeDb
	});

	for (const file of fs.readdirSync("./translations", { withFileTypes: true })) {
		if (file.isFile() && file.name.endsWith(".po")) {
			const jsonpo = po.parse(fs.readFileSync(`./translations/${file.name}`));
			const locale = file.name.split(".po")[0];
			addLocale(locale, jsonpo);
			logger.info(`Loaded translations for locale ${locale}`);
		}
	}

	//container.registerSingleton<Metrics>(Metrics);
	container.registerSingleton<LocaleProvider>("LocaleProvider", SQLiteLocaleProvider);
	classes.forEach(Class => container.register<Command>("Command", { useClass: Class }));
	container.register<InteractionListener>("Listener", { useClass: InteractionListener });
	container.register<MessageListener>("Listener", { useClass: MessageListener });
	//container.register<BotFactory>(BotFactory, { useClass: BotFactory });

	const bot = container.resolve(BotFactory).createInstance();
	process.once("SIGTERM", () => {
		bot.destroy();
		container.resolve(Metrics).destroy();
		container.resolve(SQLiteLocaleProvider).destroy();
	});
	// Implicitly use DISCORD_TOKEN
	bot.login();
}
