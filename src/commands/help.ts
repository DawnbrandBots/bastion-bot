import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";

@injectable()
export class HelpCommand extends Command {
    #logger = getLogger("command:help");

    static override get meta(): ApplicationCommandData {
        return {
            name: "help",
            description: "Learn how to use this bot."
        };
    }

    protected override get logger(): Logger {
        return this.#logger;
    }

    protected override async execute(interaction: CommandInteraction): Promise<number> {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(
            `My documentation can be found at a private GitHub URL.\nRevision: ${process.env.BOT_REVISION}.`
        );
        return latency;
    }
}
