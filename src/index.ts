import { debug } from "debug";
import { ShardingManager } from "discord.js";

const logger = debug("sharding");
const log = logger.extend("log");
const warn = logger.extend("warn");
const error = logger.extend("error");

const manager = new ShardingManager("./bot.js", {
    token: `${process.env.DISCORD_TOKEN}`,
    totalShards: parseInt(`${process.env.DISCORD_TOTAL_SHARDS}`) || "auto"
});

manager.on("shardCreate", shard => log(`Shard ${shard} spawned.`));
manager.spawn();
