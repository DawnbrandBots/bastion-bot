import dotenv from "dotenv";
dotenv.config();
import debug from "debug";
import { Client, PossiblyUncachedGuild } from "eris";

export function serializeServer(server: PossiblyUncachedGuild): string {
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

const bot = new Client(`${process.env.DISCORD_TOKEN}`, { restMode: true });
bot.on("warn", (message, shard) => warn(`Shard ${shard}: ${message}`));
bot.on("error", (message, shard) => error(`Shard ${shard}: ${message}`));
bot.on("connect", shard => log(`Shard ${shard} connected to Discord`));
bot.on("disconnect", () => log("Disconnected from Discord"));
bot.on("shardReady", shard => log(`Shard ${shard} ready`));
bot.on("shardDisconnect", shard => log(`Shard ${shard} disconnected`));
bot.on("guildCreate", guild => log(`Guild create: ${serializeServer(guild)}`));
bot.on("guildDelete", guild => log(`Guild delete: ${serializeServer(guild)}`));
bot.on("ready", () => log(`Logged in as ${bot.user.username}#${bot.user.discriminator} - ${bot.user.id}`));

bot.connect().catch(error);
process.once("SIGTERM", () => bot.disconnect({ reconnect: false }));
