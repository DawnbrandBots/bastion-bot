import { REST } from "@discordjs/rest";
import { APIUser, Routes } from "discord-api-types/v10";
import { ApplicationIntegrationType } from "discord.js";
import { ArtCommand } from "./art";
import { DeckCommand } from "./deck";
import { HelpCommand } from "./help";
import { IdCommand } from "./id";
import { LinkCommand } from "./link";
import { LocaleCommand } from "./locale";
import { LocaleUserCommand } from "./locale-user";
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
	LocaleUserCommand,
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
	LocaleUserCommand,
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
export async function registerSlashCommands(guild?: `${bigint}` | "user-install"): Promise<void> {
	const commands =
		guild === "user-install"
			? classes
					.filter(command => command.meta.integration_types)
					.map(command => ({
						...command.meta,
						integration_types: [ApplicationIntegrationType.UserInstall]
					}))
			: classes.map(command => command.meta);
	console.log("Generated command metadata:");
	console.log(JSON.stringify(commands, null, 4));

	const api = new REST().setToken(`${process.env.DISCORD_TOKEN}`);

	// Server commands deploy instantly, but global commands may take up to an hour to roll out
	const botUser = (await api.get(Routes.user())) as APIUser;
	console.log(botUser.id);
	console.log(`${botUser.username}#${botUser.discriminator}`);

	const created = await api.put(
		guild === undefined || guild === "user-install"
			? Routes.applicationCommands(botUser.id)
			: Routes.applicationGuildCommands(botUser.id, guild),
		{ body: commands }
	);
	console.log("Created Slash Commands:");
	console.log(JSON.stringify(created, null, 4));
}
