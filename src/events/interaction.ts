import { Interaction } from "discord.js";
import { injectable, injectAll } from "tsyringe";
import { Listener } from ".";
import { Command } from "../Command";
import { EventLocker } from "../event-lock";
import { getLogger } from "../logger";
import { serializeCommand } from "../utils";

@injectable()
export class InteractionListener implements Listener<"interactionCreate"> {
	readonly type = "interactionCreate";

	#logger = getLogger("events:interaction");

	private commands: Map<string, Command>;

	constructor(@injectAll("Command") commands: Command[], private eventLocks: EventLocker) {
		this.commands = new Map();
		for (const command of commands) {
			this.commands.set(command.meta.name, command);
		}
	}

	async run(interaction: Interaction): Promise<void> {
		if (!interaction.isChatInputCommand()) {
			return;
		}
		if (this.eventLocks.has(interaction.id, this.type)) {
			this.#logger.verbose(serializeCommand(interaction));
			await this.commands.get(interaction.commandName)?.run(interaction);
		} else {
			this.#logger.verbose(serializeCommand(interaction, { skipNoLock: true }));
		}
	}
}
