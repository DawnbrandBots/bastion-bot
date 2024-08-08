import { REST } from "@discordjs/rest";
import { APIUser, Routes } from "discord-api-types/v10";
import { ArtCommand } from "./art";
import { DeckCommand } from "./deck";
import { HelpCommand } from "./help";
import { IdCommand } from "./id";
import { LinkCommand } from "./link";
import { LocaleCommand } from "./locale";
import { MetagameCommand } from "./metagame";
import { PingCommand } from "./ping";
import { PriceCommand } from "./price";
import { QueryCommand } from "./query";
import { RandomCommand } from "./random";
import { RushDuelCommand } from "./rush-duel";
import { SearchCommand } from "./search";
import { YGOPRODECKCommand } from "./ygoprodeck";
import { YugiCommand } from "./yugipedia";

// Exported only for unit tests
export const productionCommandClasses = [
	DeckCommand,
	PingCommand,
	LinkCommand,
	YugiCommand,
	IdCommand,
	SearchCommand,
	YGOPRODECKCommand,
	LocaleCommand,
	ArtCommand,
	RandomCommand,
	HelpCommand,
	PriceCommand,
	RushDuelCommand,
	MetagameCommand
];
export const previewCommandClasses = [QueryCommand];

export const classes = [
	...productionCommandClasses,
	...(process.env.BOT_NO_DIRECT_MESSAGE_SEARCH ? previewCommandClasses : [])
];

export {
	ArtCommand,
	DeckCommand,
	HelpCommand,
	IdCommand,
	LinkCommand,
	LocaleCommand,
	MetagameCommand,
	PingCommand,
	PriceCommand,
	QueryCommand,
	RandomCommand,
	RushDuelCommand,
	SearchCommand,
	YGOPRODECKCommand,
	YugiCommand
};

// Register Slash Commands on CI
// Specify the guild snowflake to instantly deploy commands on the specified server.
// Otherwise, global commands can take up to an hour to roll out.
export async function registerSlashCommands(guild?: `${bigint}`): Promise<void> {
	// Duplicate command metadata if they register any aliases
	const commands = classes.map(command => command.meta);
	console.log("Generated command metadata:");
	console.log(JSON.stringify(commands, null, 4));

	const api = new REST().setToken(`${process.env.DISCORD_TOKEN}`);

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
