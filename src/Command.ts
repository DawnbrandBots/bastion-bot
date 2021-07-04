import { Debugger } from "debug";
import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { serializeCommand } from "./utils";

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
            this.logger(serializeCommand(interaction, { event: "attempt", ping: interaction.client.ws.ping }));
            await this.execute(interaction);
            // This latency is incorrect!
            this.logger(
                serializeCommand(interaction, { event: "success", latency: Date.now() - interaction.createdTimestamp })
            );
        } catch (error) {
            this.logger(serializeCommand(interaction), error);
            await interaction.followUp("Something went wrong");
        }
    }
}
