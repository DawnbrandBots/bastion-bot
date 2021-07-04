import { Debugger } from "debug";
import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { Command } from "../Command";

export class PingCommand extends Command {
    #logger: Debugger;

    static override get meta(): ApplicationCommandData {
        return {
            name: "ping",
            description: "Test latency."
        };
    }

    static override get aliases(): string[] {
        return ["pong"];
    }

    constructor(parentLogger: Debugger) {
        super();
        this.#logger = parentLogger.extend("ping");
    }

    protected override get logger(): Debugger {
        return this.#logger;
    }

    protected override async execute(interaction: CommandInteraction): Promise<void> {
        const content = `WebSocket ping: ${interaction.client.ws.ping} ms`;
        await interaction.reply(content); // Actually returns void
        const reply = await interaction.fetchReply();
        if ("createdTimestamp" in reply) {
            const latency = reply.createdTimestamp - interaction.createdTimestamp;
            await interaction.editReply(`${content}\nTotal latency: ${latency} ms`);
        } else {
            const latency = Number(reply.timestamp) - interaction.createdTimestamp;
            await interaction.editReply(`${content}\nTotal latency: ${latency} ms\nUnexpected response format`);
        }
    }
}
