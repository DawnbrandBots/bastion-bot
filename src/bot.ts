import debug from "debug";
import { Client, Intents } from "discord.js";
import { HelpCommand } from "./commands/help";
import { PingCommand } from "./commands/ping";
import { createMessageListener, InteractionListener } from "./events";
import { serializeServer } from "./utils";

const logger = debug("bot");
const log = logger.extend("log");
const warn = logger.extend("warn");
const error = logger.extend("error");

const shard = parseInt(`${process.env.DISCORD_SHARD}`) - 1;

const bot = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
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
    //const command = await bot.application?.commands.create({
    //    name: "test",
    //    description: "Verify the bot is running with a link to the documentation."
    //});
    //const command = bot.guilds.cache.get("381294999729340417")?.commands.create({
    //    name: "help",
    //    description: "AKDB exclusive"
    //});
    //log(command);
});

const interaction = new InteractionListener(log, [new HelpCommand(log), new PingCommand(log)]);
bot.on("interaction", interaction.run.bind(interaction));
bot.on("message", createMessageListener(error));

export default bot;
