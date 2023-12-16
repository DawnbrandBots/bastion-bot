import { ActivityType, Client, GatewayIntentBits, Options, Partials } from "discord.js";
import { injectAll, injectable } from "tsyringe";
import { Listener } from "./events";
import { getLogger } from "./logger";
import { serialiseServer } from "./utils";

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
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				// Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
				GatewayIntentBits.DirectMessages
				// Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
			],
			partials: [
				Partials.Channel, // for direct message events
				Partials.Message // for message deletion events
			],
			shards: `${process.env.DISCORD_TOTAL_SHARDS}` === "auto" ? "auto" : isNaN(shard) ? undefined : shard,
			shardCount: parseInt(`${process.env.DISCORD_TOTAL_SHARDS}`) || undefined,
			makeCache: Options.cacheWithLimits({
				GuildEmojiManager: 0,
				GuildTextThreadManager: 0,
				MessageManager: 0 // reduce cache per channel from default 200
			})
		});

		const state = process.env.BOT_PRESENCE || "🔎 <card name> to search!";
		function setActivity(): void {
			bot.user?.setActivity(state, { type: ActivityType.Custom });
		}

		bot.on("warn", message => logger.warn(`Shard ${bot.shard}: ${message}`));
		bot.on("error", message => logger.error(`Shard ${bot.shard}: ${message}`));
		bot.on("shardReady", shard => logger.notify(`Shard ${shard} ready`));
		bot.on("shardReconnecting", shard => logger.info(`Shard ${shard} reconnecting`));
		bot.on("shardResume", (shard, replayed) => logger.info(`Shard ${shard} resumed: ${replayed} events replayed`));
		bot.on("shardDisconnect", (event, shard) => logger.notify(`Shard ${shard} disconnected (${event.code})`));
		bot.on("shardError", (error, shard) => logger.error(`Shard ${shard} error:`, error));
		bot.on("guildCreate", guild => logger.notify(`Guild create: ${serialiseServer(guild)}`));
		bot.on("guildDelete", guild => logger.notify(`Guild delete: ${serialiseServer(guild)}`));
		bot.on("ready", () => {
			logger.notify(`Logged in as ${bot.user?.tag} - ${bot.user?.id}`);
			// May get blanked by reconnections and other things, so reapply every hour
			setActivity();
			setInterval(setActivity, 1000 * 60 * 60);
		});

		bot.once("ready", () => {
			let lastEventTimestamp = Date.now();
			let incidentNotified = false;
			bot.on("messageCreate", () => void (lastEventTimestamp = Date.now()));
			setInterval(() => {
				if (Date.now() - lastEventTimestamp > 60000) {
					if (!incidentNotified) {
						logger.warn("⚠️ No messageCreate gateway events received for one minute ⚠️");
						incidentNotified = true;
					}
				} else {
					if (incidentNotified) {
						logger.notify("Started receiving messageCreate gateway events again");
					}
					incidentNotified = false;
				}
			}, 1000).unref();
			logger.info("Registered messageCreate gateway event frequency early warning canary");
		});

		// Obtain the snowflakes for all our Slash Commands so they can be mentioned
		bot.once("ready", async () => void (await bot.application?.commands.fetch()));

		for (const listener of this.listeners) {
			bot.on(listener.type, (...args) => listener.run(...args));
		}

		return bot;
	}
}
