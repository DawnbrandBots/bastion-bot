import dotenv from "dotenv";
dotenv.config();
import debug from "debug";
import { Client, ClientOptions, Guild, Intents } from "discord.js";

export function serializeServer(server: Guild): string {
    if ("name" in server) {
        const createdAt = new Date(server.createdAt).toISOString();
        return `${server.name} (${server.id}) [${server.memberCount}] ${createdAt} by <@${server.ownerID}>`;
    } else {
        return `${server.id}`;
    }
}

const logger = debug("bot");
const log = logger.extend("log");
const warn = logger.extend("warn");
const error = logger.extend("error");

const clientOptions: ClientOptions = {
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
};

const bot = new Client(clientOptions);

bot.on("warn", message => warn(`Shard ${bot.shard}: ${message}`));
bot.on("error", message => error(`Shard ${bot.shard}: ${message}`));
bot.on("connect", shard => log(`Shard ${shard} connected to Discord`));
bot.on("disconnect", () => log("Disconnected from Discord"));
bot.on("shardReady", shard => log(`Shard ${shard} ready`));
bot.on("shardDisconnect", shard => log(`Shard ${shard} disconnected`));
bot.on("guildCreate", guild => log(`Guild create: ${serializeServer(guild)}`));
bot.on("guildDelete", guild => log(`Guild delete: ${serializeServer(guild)}`));
bot.on("ready", () => log(`Logged in as ${bot.user?.tag} - ${bot.user?.id}`));

bot.application?.commands
    .create({
        name: "help",
        description: "Verify the bot is running with a link to the documentation."
    })
    .catch(error);

bot.on("interaction", async interaction => {
    if (!interaction.isCommand()) {
        return;
    }
    if (interaction.commandName === "help") {
        await interaction.reply(
            `My documentation can be found at a private GitHub URL.\nRevision: ${process.env.BOT_REVISION}.`
        );
    }
});

bot.login(`${process.env.DISCORD_TOKEN}`).catch(error);
process.once("SIGTERM", () => bot.destroy());