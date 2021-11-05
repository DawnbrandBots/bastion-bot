import { ChatInputApplicationCommandData, CommandInteraction } from "discord.js";
import { Logger } from "./logger";
import { metrics } from "./metrics";
import { serializeCommand } from "./utils";

export abstract class Command {
	static get meta(): ChatInputApplicationCommandData {
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

	get meta(): ChatInputApplicationCommandData {
		return this.constructor.meta;
	}

	get aliases(): string[] {
		return this.constructor.aliases;
	}

	protected abstract get logger(): Logger;

	/**
	 * Execute this command in response to a Slash Command. May throw exceptions,
	 * which will be captured and logged appropriately, and feedback will be
	 * provided to the user.
	 *
	 * @param interaction
	 * @returns latency metric in milliseconds
	 */
	protected abstract execute(interaction: CommandInteraction): Promise<number>;

	/**
	 * Run this command in response to user interaction from start to finish.
	 * Does not throw exceptions.
	 *
	 * @param interaction
	 */
	async run(interaction: CommandInteraction): Promise<void> {
		try {
			this.logger.verbose(serializeCommand(interaction, { event: "attempt", ping: interaction.client.ws.ping }));
			const latency = await this.execute(interaction);
			this.logger.verbose(serializeCommand(interaction, { event: "success", latency }));
			await metrics.writeCommand(interaction);
		} catch (error) {
			this.logger.error(serializeCommand(interaction), error);
			await interaction
				.followUp("Something went wrong")
				.catch(e => this.logger.error(serializeCommand(interaction), e));
		}
	}
}
