import { REST } from "@discordjs/rest";
import { APIUser, Routes } from "discord-api-types/v9";
import { ApplicationCommandData, ClientApplication, Guild, Snowflake } from "discord.js";
import { DeckCommand } from "./deck";
import { LinkCommand } from "./link";
import { PingCommand } from "./ping";
import { YugiCommand } from "./yugipedia";

export const classes = [DeckCommand, PingCommand, LinkCommand, YugiCommand];
export { DeckCommand, PingCommand, LinkCommand, YugiCommand };

interface LoggableCommandMetadata {
	id: Snowflake;
	name: string;
	description: string;
}

async function deployCommands(
	api: Guild | ClientApplication,
	commands: ApplicationCommandData[]
): Promise<LoggableCommandMetadata[]> {
	await api.commands.set(commands);
	// This is a bug in TypeScript failing to resolve the correct overload! TODO report
	const created = await ("guild" in api.commands ? api.commands.fetch() : api.commands.fetch());
	return created.map(command => ({
		id: command.id,
		name: command.name,
		description: command.description
	}));
}

// Register Slash Commands on CI
// Specify the guild snowflake to instantly deploy commands on the specified server.
// Otherwise, global commands can take up to an hour to roll out.
export async function registerSlashCommands(guild?: `${bigint}`): Promise<void> {
	// Duplicate command metadata if they register any aliases
	const commands = classes.map(command => command.meta);
	console.log("Generated command metadata:");
	console.log(commands);

	// The default version is 9, but we'll be explicit in case unexpected version bumps happen
	const api = new REST({ version: "9" }).setToken(`${process.env.DISCORD_TOKEN}`);

	// Server commands deploy instantly, but global commands may take up to an hour to roll out
	const botUser = (await api.get(Routes.user())) as APIUser;
	console.log(botUser.id);
	console.log(`${botUser.username}#${botUser.discriminator}`);

	const created = await api.put(
		guild === undefined
			? Routes.applicationCommands(botUser.id)
			: Routes.applicationGuildCommands(botUser.id, guild),
		{ body: commands }
	);
	console.log("Created Slash Commands:");
	console.log(created);
}
