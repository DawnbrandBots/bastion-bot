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
        const response = await interaction.reply(`WebSocket ping: ${interaction.client.ws.ping} ms`);
        const latency =
            ("timestamp" in response ? Number(response.timestamp) : response.createdTimestamp) -
            interaction.createdTimestamp;
        await interaction.editReply(`${response.content}\nTotal latency: ${latency} ms`);
    }
}
