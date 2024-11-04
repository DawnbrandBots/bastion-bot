import { SharedNameAndDescription, SlashCommandIntegerOption, SlashCommandStringOption } from "@discordjs/builders";
import sqlite, { Database, Statement } from "better-sqlite3";
import { APIApplicationCommandOptionChoice, Locale as DiscordLocale } from "discord-api-types/v10";
import {
	ApplicationIntegrationType,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	InteractionContextType,
	Message,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	Snowflake
} from "discord.js";
import fs from "fs";
import { po } from "gettext-parser";
import { inject, singleton } from "tsyringe";
import { addLocale, c, useLocale } from "ttag";
import { getLogger } from "./logger";

export function loadTranslations(): string[] {
	const locales = [];
	for (const file of fs.readdirSync("./translations", { withFileTypes: true })) {
		if (file.isFile() && file.name.endsWith(".po")) {
			const jsonpo = po.parse(fs.readFileSync(`./translations/${file.name}`));
			const locale = file.name.split(".po")[0];
			addLocale(locale, jsonpo);
			locales.push(locale);
			getLogger("locale").info(`Loaded translations for locale ${locale}`);
		}
	}
	return locales;
}

type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

export const LOCALE_CHOICES = [
	{ name: "English", value: "en" },
	{ name: "Español", value: "es" },
	{ name: "Français", value: "fr" },
	{ name: "Deutsch", value: "de" },
	{ name: "Italiano", value: "it" },
	{ name: "Português", value: "pt" },
	{ name: "日本語", value: "ja" },
	{ name: "한국어", value: "ko" },
	{ name: "简体中文", value: "zh-CN" },
	{ name: "繁體中文", value: "zh-TW" }
] as const;
export const LOCALES = LOCALE_CHOICES.map(c => c.value);
export type Locale = ArrayElement<typeof LOCALES>;
export const LOCALES_MAP = new Map(LOCALE_CHOICES.map(c => [c.value, c.name] as const));
export const COMMAND_LOCALIZATIONS = [
	{ gettext: "es", discord: DiscordLocale.SpanishES },
	{ gettext: "fr", discord: DiscordLocale.French },
	{ gettext: "de", discord: DiscordLocale.German },
	{ gettext: "it", discord: DiscordLocale.Italian },
	{ gettext: "pt", discord: DiscordLocale.PortugueseBR },
	{ gettext: "ja", discord: DiscordLocale.Japanese },
	{ gettext: "ko", discord: DiscordLocale.Korean },
	{ gettext: "zh-CN", discord: DiscordLocale.ChineseCN },
	{ gettext: "zh-TW", discord: DiscordLocale.ChineseTW }
] as const;

// Cannot be an IIFE because we need to construct after .po files are loaded.
export function getResultLangStringOption(): SlashCommandStringOption {
	const option = new SlashCommandStringOption()
		.setName("result-language")
		.setDescription("The output language for the card embed, overriding other settings.")
		.setRequired(false)
		.addChoices(...LOCALE_CHOICES);

	for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
		useLocale(gettext);
		option
			.setNameLocalization(discord, c("command-option").t`result-language`)
			.setDescriptionLocalization(
				discord,
				c("command-option-description").t`The output language for the card embed, overriding other settings.`
			);
	}

	return option;
}

export function everywhereCommand(): SlashCommandBuilder {
	return new SlashCommandBuilder()
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);
}

/**
 * Helper for integrating ttag gettext localisations with discord.js builders.
 * @param component SlashCommandBuilder, subcommand builder, option builder, etc.
 * @param getLocalisedName Lambda function returning the name using gettext.
 * @param getLocalisedDescription Lambda function returning the description using gettext.
 * @returns the same `component`, with the name, description, and all localisations added.
 */
export function buildLocalisedCommand<T extends SharedNameAndDescription>(
	component: T,
	getLocalisedName: () => string,
	getLocalisedDescription: () => string
): T {
	useLocale("en");
	component.setName(getLocalisedName()).setDescription(getLocalisedDescription());
	for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
		useLocale(gettext);
		component
			.setNameLocalization(discord, getLocalisedName())
			.setDescriptionLocalization(discord, getLocalisedDescription());
	}
	return component;
}

/**
 * Helper for integrating ttag gettext localisations with discord.js command option builders.
 * @param value
 * @param getLocalisedName Lambda function returning the name using gettext.
 * @returns an argument for an option builder's addChoices method
 */
export function buildLocalisedChoice<T = string | number>(
	value: T,
	getLocalisedName: () => string
): APIApplicationCommandOptionChoice<T> {
	useLocale("en");
	const choice: APIApplicationCommandOptionChoice<T> = {
		name: getLocalisedName(),
		value
	};
	// Initialising separately helps TypeScript figure out that it isn't null
	choice.name_localizations = {};
	for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
		useLocale(gettext);
		choice.name_localizations[discord] = getLocalisedName();
	}
	return choice;
}

export function getInputLangStringOption(): SlashCommandStringOption {
	return buildLocalisedCommand(
		new SlashCommandStringOption().setRequired(false),
		() => c("command-option").t`input-language`,
		() => c("command-option-description").t`The language to search in, defaulting to the result language.`
	).addChoices(...LOCALE_CHOICES);
}

export function getNameSubcommand(
	getLocalisedDescription: () => string,
	requiredStringOption?: SlashCommandStringOption
): SlashCommandSubcommandBuilder {
	const builder = buildLocalisedCommand(
		new SlashCommandSubcommandBuilder(),
		() => c("command-option").t`name`,
		getLocalisedDescription
	).addStringOption(
		buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Card name, fuzzy matching supported.`
		)
	);
	if (requiredStringOption) {
		builder.addStringOption(requiredStringOption);
	}
	return builder.addStringOption(getInputLangStringOption());
}

export function getPasswordSubcommand(getLocalisedDescription: () => string): SlashCommandSubcommandBuilder {
	return buildLocalisedCommand(
		new SlashCommandSubcommandBuilder(),
		() => c("command-option").t`password`,
		getLocalisedDescription
	).addIntegerOption(
		buildLocalisedCommand(
			new SlashCommandIntegerOption().setRequired(true).setMinValue(0).setMaxValue(999999999),
			() => c("command-option").t`input`,
			() =>
				c("command-option-description")
					.t`Card password, the eight-digit number printed on the bottom left corner.`
		)
	);
}

export function getKonamiIdSubcommand(getLocalisedDescription: () => string): SlashCommandSubcommandBuilder {
	return buildLocalisedCommand(
		new SlashCommandSubcommandBuilder(),
		() => c("command-option").t`konami-id`,
		getLocalisedDescription
	).addIntegerOption(
		buildLocalisedCommand(
			new SlashCommandIntegerOption().setRequired(true).setMinValue(4007).setMaxValue(99999),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Konami's official card database identifier.`
		)
	);
}

/**
 * Abstract persistent store for locale overrides. We need this if we switch to
 * multiprocess sharding in the future and demand is high, since SQLite cannot
 * handle concurrent writes. Promise?
 */
export abstract class LocaleProvider {
	abstract guild(id: Snowflake): Promise<Locale | null>;
	abstract channel(id: Snowflake): Promise<Locale | null>;
	abstract setForGuild(id: Snowflake, set: Locale | null): Promise<void>;
	abstract setForChannel(id: Snowflake, set: Locale | null): Promise<void>;

	/**
	 * channel.parentId may refer to a category or a text channel. Return the parent text channel
	 * for threads only, and the current channel otherwise.
	 *
	 * @param context
	 * @returns The channel snowflake to use for setting locale
	 */
	getChannel(context: ChatInputCommandInteraction | AutocompleteInteraction | Message): Snowflake {
		return (context.channel?.isThread() && context.channel.parentId) || context.channelId;
	}

	async get(interaction: ChatInputCommandInteraction | AutocompleteInteraction): Promise<Locale> {
		const lang = interaction.options.getString("result-language");
		if (lang) {
			// We could verify with this.filter, but that unnecessarily checks through
			// the entire list when we know that this entire codebase should use
			// getResultLangStringOption if it has a lang option to a command.
			return lang as Locale;
		}
		if (interaction.inGuild()) {
			// Channel settings override server-wide settings override Discord-reported
			// server locale. Threads are treated as an extension of their parent channel.
			return (
				(await this.channel(this.getChannel(interaction))) ??
				(await this.guild(interaction.guildId)) ??
				this.filter(interaction.guildLocale)
			);
		} else {
			// In direct messages, it is safe to use the user's Discord-reported locale
			// without breaching privacy. Further support configuring the locale in the DM.
			return (await this.channel(interaction.channelId)) ?? this.filter(interaction.locale);
		}
	}

	async getM(context: Message): Promise<Locale> {
		if (context.inGuild()) {
			// Channel settings override server-wide settings override Discord-reported
			// server locale. Threads are treated as an extension of their parent channel.
			return (
				(await this.channel(this.getChannel(context))) ??
				(await this.guild(context.guildId)) ??
				this.filter(context.guild.preferredLocale)
			);
		} else {
			// Cannot retrieve the user's locale from a direct message.
			return (await this.channel(context.channelId)) ?? "en";
		}
	}

	private isLocale(candidate: string): candidate is Locale {
		// https://github.com/microsoft/TypeScript/issues/26255
		// https://github.com/microsoft/TypeScript/issues/31018
		const locales: readonly string[] = LOCALES;
		return locales.includes(candidate);
	}
	/**
	 * Convert Discord-provided locales into the relevant ones that we support.
	 * This may simplify to ISO 639-1 codes (e.g. English locales) or fall back
	 * to English altogether.
	 * @param discordLocale
	 */
	private filter(discordLocale: string): Locale {
		if (this.isLocale(discordLocale)) {
			return discordLocale;
		}
		const locale = discordLocale.split("-")[0];
		if (this.isLocale(locale)) {
			return locale;
		} else {
			return "en";
		}
	}
}

type SQLiteLocaleRow = { locale: Locale };
/**
 * Implementation in two SQLite tables in the same database. With sufficient
 * scale, this would need to be periodically cleaned as guilds and channels are
 * removed, especially with threads, if they are also stored here.
 */
@singleton()
export class SQLiteLocaleProvider extends LocaleProvider {
	private readonly db: Database;
	private readonly readGuild: Statement;
	private readonly writeGuild: Statement;
	private readonly deleteGuild: Statement;
	private readonly readChannel: Statement;
	private readonly writeChannel: Statement;
	private readonly deleteChannel: Statement;
	constructor(@inject("localeDb") file: string) {
		super();
		this.db = this.getDB(file);
		this.readGuild = this.db.prepare("SELECT locale FROM guilds WHERE id = ?");
		this.writeGuild = this.db.prepare("REPLACE INTO guilds VALUES(?,?)");
		this.deleteGuild = this.db.prepare("DELETE FROM guilds WHERE id = ?");
		this.readChannel = this.db.prepare("SELECT locale FROM channels WHERE id = ?");
		this.writeChannel = this.db.prepare("REPLACE INTO channels VALUES(?,?)");
		this.deleteChannel = this.db.prepare("DELETE FROM channels WHERE id = ?");
	}

	private getDB(file: string): Database {
		const db = sqlite(file);
		db.pragma("journal_mode = WAL");
		db.exec(`
CREATE TABLE IF NOT EXISTS "guilds" (
	"id"	INTEGER NOT NULL,
	"locale"	TEXT NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "channels" (
	"id"	INTEGER NOT NULL,
	"locale"	TEXT NOT NULL,
	PRIMARY KEY("id")
);`);
		return db;
	}

	public async guild(id: Snowflake): Promise<Locale | null> {
		return (this.readGuild.get(id) as SQLiteLocaleRow)?.locale || null;
	}

	public async channel(id: Snowflake): Promise<Locale | null> {
		return (this.readChannel.get(id) as SQLiteLocaleRow)?.locale || null;
	}

	public async setForGuild(id: Snowflake, set: Locale): Promise<void> {
		if (set !== null) {
			this.writeGuild.run(id, set);
		} else {
			this.deleteGuild.run(id);
		}
	}

	public async setForChannel(id: Snowflake, set: Locale): Promise<void> {
		if (set !== null) {
			this.writeChannel.run(id, set);
		} else {
			this.deleteChannel.run(id);
		}
	}

	public destroy(): void {
		this.db.close();
	}
}
