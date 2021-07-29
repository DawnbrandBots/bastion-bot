import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";

@injectable()
export class PingCommand extends Command {
    #logger = getLogger("command:ping");

    static override get meta(): ApplicationCommandData {
        return {
            name: "ping",
            description: "Test latency."
        };
    }

    static override get aliases(): string[] {
        return ["pong"];
    }

    protected override get logger(): Logger {
        return this.#logger;
    }

    protected override async execute(interaction: CommandInteraction): Promise<number> {
        const content = `WebSocket ping: ${interaction.client.ws.ping} ms`;
        await interaction.reply(content); // Actually returns void
        const reply = await interaction.fetchReply();
        if ("createdTimestamp" in reply) {
            const latency = reply.createdTimestamp - interaction.createdTimestamp;
            await interaction.editReply(`${content}\nTotal latency: ${latency} ms`);
            return latency;
        } else {
            const latency = Number(reply.timestamp) - interaction.createdTimestamp;
            await interaction.editReply(`${content}\nTotal latency: ${latency} ms\nUnexpected response format`);
            return latency;
        }
    }
}
