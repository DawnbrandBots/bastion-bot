import debug from "debug";
import { Client, Intents } from "discord.js";
import { classes } from "./commands";
import { InteractionListener, MessageListener } from "./events";
import { serializeServer } from "./utils";

export function createBot(): Client {
    const logger = debug("bot");
    const log = logger.extend("log");
    const warn = logger.extend("warn");
    const error = logger.extend("error");

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
        shards: isNaN(shard) ? undefined : shard,
        shardCount: parseInt(`${process.env.DISCORD_TOTAL_SHARDS}`) || undefined
    });

    bot.on("warn", message => warn(`Shard ${bot.shard}: ${message}`));
    bot.on("error", message => error(`Shard ${bot.shard}: ${message}`));
    bot.on("shardReady", shard => log(`Shard ${shard} ready`));
    bot.on("shardDisconnect", shard => log(`Shard ${shard} disconnected`));
    bot.on("guildCreate", guild => log(`Guild create: ${serializeServer(guild)}`));
    bot.on("guildDelete", guild => log(`Guild delete: ${serializeServer(guild)}`));
    bot.on("ready", () => log(`Logged in as ${bot.user?.tag} - ${bot.user?.id}`));
    bot.once("ready", async () => {
        bot.user?.setActivity("a revolution");
    });

    const commands = classes.map(Class => new Class(log));
    const interaction = new InteractionListener(log, commands);
    bot.on("interaction", interaction.run.bind(interaction));
    const message = new MessageListener(error);
    bot.on("message", message.run.bind(message));

    return bot;
}
