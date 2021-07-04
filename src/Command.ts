import { Debugger } from "debug";
import { ApplicationCommandData, CommandInteraction } from "discord.js";

export abstract class Command {
    static get meta(): ApplicationCommandData {
        throw new Error("Not implemented");
    }

    /**
     * Any alternative names for this command
     */
    static get aliases(): string[] {
        return [];
    }

    // Hack: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
    ["constructor"]: typeof Command;

    get meta(): ApplicationCommandData {
        return this.constructor.meta;
    }

    get aliases(): string[] {
        return this.constructor.aliases;
    }

    protected abstract get logger(): Debugger;

    /**
     * Execute this command in response to a Slash Command. May throw exceptions,
     * which will be captured and logged appropriately, and feedback will be
     * provided to the user.
     *
     * @param interaction
     */
    protected abstract execute(interaction: CommandInteraction): Promise<void>;

    /**
     * Run this command in response to user interaction from start to finish.
     * Does not throw exceptions.
     *
     * @param interaction
     */
    async run(interaction: CommandInteraction): Promise<void> {
        try {
            this.logger.log(interaction, "attempt");
            await this.execute(interaction);
            this.logger.log(interaction, "success");
        } catch (error) {
            this.logger.log(interaction, error);
            await interaction.followUp("Something went wrong");
        }
    }
}
