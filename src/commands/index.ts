import { REST } from "@discordjs/rest";
import { APIUser, Routes } from "discord-api-types/v9";
import { ArtCommand } from "./art";
import { DeckCommand } from "./deck";
import { IdCommand } from "./id";
import { LinkCommand } from "./link";
import { LocaleCommand } from "./locale";
import { PingCommand } from "./ping";
import { SearchCommand } from "./search";
import { YGOPRODECKCommand } from "./ygoprodeck";
import { YugiCommand } from "./yugipedia";

export const classes = [
	// DeckCommand,
	PingCommand,
	LinkCommand,
	YugiCommand,
	// IdCommand,
	// SearchCommand,
	YGOPRODECKCommand,
	LocaleCommand
	// ArtCommand
];
export {
	DeckCommand,
	PingCommand,
	LinkCommand,
	YugiCommand,
	IdCommand,
	SearchCommand,
	YGOPRODECKCommand,
	LocaleCommand,
	ArtCommand
};

// Register Slash Commands on CI
// Specify the guild snowflake to instantly deploy commands on the specified server.
// Otherwise, global commands can take up to an hour to roll out.
export async function registerSlashCommands(guild?: `${bigint}`): Promise<void> {
	// Duplicate command metadata if they register any aliases
	const commands = classes.map(command => command.meta);
	console.log("Generated command metadata:");
	console.log(JSON.stringify(commands, null, 4));

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
	console.log(JSON.stringify(created, null, 4));
}
