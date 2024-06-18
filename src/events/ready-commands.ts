import { ApplicationCommand, Client } from "discord.js";
import { inject, injectable } from "tsyringe";
import { Listener } from ".";
import { getLogger } from "../logger";

export type CommandCache = Map<string, ApplicationCommand>;

@injectable()
export class CommandCacheReadyListener implements Listener<"ready"> {
	readonly type = "ready";

	#logger = getLogger("events:message:ready-commands");

	constructor(@inject("commandCache") private nameToCommand: CommandCache) {}

	async run(client: Client<true>): Promise<void> {
		// Obtain the snowflakes for all our Slash Commands so they can be mentioned
		if (process.env.BOT_NO_DIRECT_MESSAGE_SEARCH) {
			// Development/preview logic: grab server commands from the registered server
			const commandCaches = await Promise.all(client.guilds.cache.map(server => server.commands.fetch()));
			const commandCache = commandCaches.find(commandCache => commandCache.size);
			this.#logger.info(`Found ${commandCache?.size} commands in server`);
			for (const command of commandCache?.values() ?? []) {
				this.nameToCommand.set(command.name, command);
			}
		} else {
			// Production logic: grab global commands
			const commandCache = await client.application.commands.fetch();
			for (const command of commandCache.values()) {
				this.nameToCommand.set(command.name, command);
			}
		}
	}

	get(commandName: string): ApplicationCommand | undefined {
		return this.nameToCommand.get(commandName);
	}
}
