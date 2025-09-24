import os from "os";
import path from "path";
import { container } from "tsyringe";
import { Command } from "./Command";
import { BotFactory } from "./bot";
import { classes, registerSlashCommands } from "./commands";
import { EventLocker } from "./event-lock";
import {
	CommandCacheReadyListener,
	InteractionListener,
	MessageDeleteListener,
	PingMessageListener,
	SearchMessageListener
} from "./events";
import { cardSearcherProvider } from "./events/message-search";
import { CommandCache } from "./events/ready-commands";
import createGotClient from "./got";
import {
	genesysPointsProvider,
	limitRegulationMasterDuelProvider,
	limitRegulationRushProvider
} from "./limit-regulation";
import { LocaleProvider, SQLiteLocaleProvider, loadTranslations } from "./locale";
import { getLogger } from "./logger";
import { RecentMessageCache } from "./message-cache";
import { Metrics } from "./metrics";

const logger = getLogger("index");

loadTranslations();

if (process.argv.length > 2 && process.argv[2] === "--deploy-slash") {
	// We don't need to verify the bigint typing since this CLI operation will safely fail
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	registerSlashCommands(process.argv[3] as any);
} else {
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

	const abdeployJson = process.argv[2]
		? path.join(process.argv[2], "abdeploy.json")
		: path.join(os.tmpdir(), "bastion-abdeploy.json");
	container.register<string>("abdeployJson", {
		useValue: abdeployJson
	});

	const locksDb = process.argv[2]
		? path.join(process.argv[2], "locks.db3")
		: path.join(os.tmpdir(), "bastion-locks.db3");
	logger.info(`Storing event locks in ${localeDb}`);
	container.register<string>("locksDb", {
		useValue: locksDb
	});

	container.registerInstance("got", createGotClient());

	// TTL: 5 minutes, sweep every 5 minutes
	container.registerInstance<RecentMessageCache>(RecentMessageCache, new RecentMessageCache(300000, 300000));
	container.registerInstance<CommandCache>("commandCache", new Map());

	container.register("limitRegulationRush", limitRegulationRushProvider);
	container.register("limitRegulationMasterDuel", limitRegulationMasterDuelProvider);
	container.register("genesysPoints", genesysPointsProvider);
	container.register("cardSearchers", { useFactory: cardSearcherProvider });

	//container.registerSingleton<Metrics>(Metrics);
	container.registerSingleton<LocaleProvider>("LocaleProvider", SQLiteLocaleProvider);
	classes.forEach(Class => container.register<Command>("Command", { useClass: Class }));
	container.register<InteractionListener>("Listener", { useClass: InteractionListener });
	container.register<PingMessageListener>("Listener", { useClass: PingMessageListener });
	container.register<SearchMessageListener>("Listener", { useClass: SearchMessageListener });
	container.register<MessageDeleteListener>("Listener", { useClass: MessageDeleteListener });
	container.register<CommandCacheReadyListener>("Listener", { useClass: CommandCacheReadyListener });
	//container.register<BotFactory>(BotFactory, { useClass: BotFactory });

	const bot = container.resolve(BotFactory).createInstance();
	process.once("SIGTERM", () => {
		bot.destroy();
		container.resolve(Metrics).destroy();
		container.resolve(SQLiteLocaleProvider).destroy();
		container.resolve(EventLocker).destroy();
	});
	// Implicitly use DISCORD_TOKEN
	bot.login();
}
