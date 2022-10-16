import { Interaction } from "discord.js";
import { injectable, injectAll } from "tsyringe";
import { Listener } from ".";
import { AutocompletableCommand, Command } from "../Command";
import { getLogger } from "../logger";
import { serialiseInteraction } from "../utils";

@injectable()
export class InteractionListener implements Listener<"interactionCreate"> {
	readonly type = "interactionCreate";

	#logger = getLogger("events:interaction");

	private readonly commands = new Map<string, Command>();
	private readonly autocompletes = new Map<string, AutocompletableCommand>();

	constructor(@injectAll("Command") commands: Command[]) {
		for (const command of commands) {
			this.commands.set(command.meta.name, command);
			if (command instanceof AutocompletableCommand) {
				this.autocompletes.set(command.meta.name, command);
			}
		}
	}

	async run(interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			this.#logger.verbose(serialiseInteraction(interaction));
			await this.commands.get(interaction.commandName)?.run(interaction);
		} else if (interaction.isAutocomplete()) {
			this.#logger.verbose(serialiseInteraction(interaction, { autocomplete: interaction.options.getFocused() }));
			await this.autocompletes.get(interaction.commandName)?.autocomplete(interaction);
		}
	}
}
