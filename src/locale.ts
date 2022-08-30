import { SlashCommandStringOption } from "@discordjs/builders";
import sqlite, { Database, Statement } from "better-sqlite3";
import { Locale as DiscordLocale } from "discord-api-types/v9";
import { CommandInteraction, Message, Snowflake } from "discord.js";
import { inject, singleton } from "tsyringe";
import { c, useLocale } from "ttag";

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

export function getInputLangStringOption(): SlashCommandStringOption {
	const option = new SlashCommandStringOption()
		.setName("input-language")
		.setDescription("The language to search in, defaulting to the result language.")
		.setRequired(false)
		.addChoices(...LOCALE_CHOICES);

	for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
		useLocale(gettext);
		option
			.setNameLocalization(discord, c("command-option").t`input-language`)
			.setDescriptionLocalization(
				discord,
				c("command-option-description").t`The language to search in, defaulting to the result language.`
			);
	}

	return option;
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
	 * @param interaction
	 * @returns The channel snowflake to use for setting locale
	 */
	getChannel(interaction: CommandInteraction): Snowflake {
		return (interaction.channel?.isThread() && interaction.channel.parentId) || interaction.channelId;
	}

	async get(interaction: CommandInteraction): Promise<Locale> {
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
				(await this.channel(
					(interaction.channel?.isThread() && interaction.channel.parentId) || interaction.channelId
				)) ??
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
				(await this.channel((context.channel?.isThread() && context.channel.parentId) || context.channelId)) ??
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
		return this.readGuild.get(id)?.locale || null;
	}

	public async channel(id: Snowflake): Promise<Locale | null> {
		return this.readChannel.get(id)?.locale || null;
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
