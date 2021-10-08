import { Client, Intents } from "discord.js";
import { injectable, injectAll } from "tsyringe";
import { Listener } from "./events";
import { getLogger } from "./logger";
import { serializeServer } from "./utils";

@injectable()
export class BotFactory {
	// This is not type-safe! TypeScript doesn't support declaring an array of generic
	// Listeners without a specialization though. This requires an existential type:
	// https://github.com/microsoft/TypeScript/issues/14466
	// https://stackoverflow.com/questions/65129070/defining-an-array-of-differing-generic-types-in-typescript
	// https://stackoverflow.com/questions/292274/what-is-an-existential-type
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(@injectAll("Listener") private listeners: Listener<any>[]) {}

	createInstance(): Client {
		const logger = getLogger("events");

		const shard = parseInt(`${process.env.DISCORD_SHARD}`) - 1;

		const bot = new Client({
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				Intents.FLAGS.DIRECT_MESSAGES,
				Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
			],
			partials: ["CHANNEL"],
			shards: `${process.env.DISCORD_TOTAL_SHARDS}` === "auto" ? "auto" : isNaN(shard) ? undefined : shard,
			shardCount: parseInt(`${process.env.DISCORD_TOTAL_SHARDS}`) || undefined
		});

		bot.on("warn", message => logger.warn(`Shard ${bot.shard}: ${message}`));
		bot.on("error", message => logger.error(`Shard ${bot.shard}: ${message}`));
		bot.on("shardReady", shard => logger.notify(`Shard ${shard} ready`));
		bot.on("shardReconnecting", shard => logger.notify(`Shard ${shard} reconnecting`));
		bot.on("shardResume", (shard, replayed) =>
			logger.notify(`Shard ${shard} resumed: ${replayed} events replayed`)
		);
		bot.on("shardDisconnect", (event, shard) =>
			logger.notify(`Shard ${shard} disconnected (${event.code},${event.wasClean}): ${event.reason}`)
		);
		bot.on("shardError", (error, shard) => logger.error(`Shard ${shard} error:`, error));
		bot.on("guildCreate", guild => logger.notify(`Guild create: ${serializeServer(guild)}`));
		bot.on("guildDelete", guild => logger.notify(`Guild delete: ${serializeServer(guild)}`));
		bot.on("ready", () => {
			logger.notify(`Logged in as ${bot.user?.tag} - ${bot.user?.id}`);
			bot.user?.setActivity(process.env.BOT_PRESENCE || "<card name> to search!");
		});

		for (const listener of this.listeners) {
			bot.on(listener.type, (...args) => listener.run(...args));
		}

		return bot;
	}
}
