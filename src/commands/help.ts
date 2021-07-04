import { Debugger } from "debug";
import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { Command } from "../Command";

export class HelpCommand extends Command {
    #logger: Debugger;

    static override get meta(): ApplicationCommandData {
        return {
            name: "help",
            description: "Verify the bot is running with a link to the documentation."
        };
    }

    constructor(parentLogger: Debugger) {
        super();
        this.#logger = parentLogger.extend("help");
    }

    protected override get logger(): Debugger {
        return this.#logger;
    }

    protected override async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.reply(
            `My documentation can be found at a private GitHub URL.\nRevision: ${process.env.BOT_REVISION}.`
        );
    }
}
