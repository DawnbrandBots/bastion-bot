import { Static } from "@sinclair/typebox";
import sqlite, { Database, Statement } from "better-sqlite3";
import { AutocompleteInteraction, ChatInputCommandInteraction, Message } from "discord.js";
import { inject, singleton } from "tsyringe";
import { CardSchema } from "./definitions";
import { RushCardSchema } from "./definitions/rush";
import { SearchResult, SearchSummon } from "./events/message-search";

@singleton()
export class Metrics {
	private readonly db: Database;
	private readonly commandStatement: Statement;
	private readonly searchStatement: Statement;
	constructor(@inject("metricsDb") metricsDb: string) {
		this.db = this.getDB(metricsDb);
		this.commandStatement = this.db.prepare("INSERT INTO commands2 VALUES(?,?,?,?,?,?,?,?,?,?,?,?)");
		this.searchStatement = this.db.prepare("INSERT INTO searches2 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
	}

	private getDB(metricsDb: string): Database {
		const db = sqlite(metricsDb);
		db.pragma("journal_mode = WAL");
		db.exec(`
CREATE TABLE IF NOT EXISTS "commands" (
	"id"	TEXT NOT NULL,
	"guild"	TEXT,
	"channel"	TEXT NOT NULL,
	"author"	TEXT NOT NULL,
	"command"	TEXT NOT NULL,
	"args"	TEXT NOT NULL,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "commands2" (
	"id"	TEXT NOT NULL,
	"guild"	TEXT,
	"channel"	TEXT NOT NULL,
	"channel_type"	INTEGER NOT NULL,
	"author"	TEXT NOT NULL,
	"context"	INTEGER,
	"authoriser"	TEXT,
	"command"	TEXT NOT NULL,
	"interaction_type"	INTEGER NOT NULL,
	"command_type"	INTEGER NOT NULL,
	"args"	TEXT NOT NULL,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "searches" (
	"message"	TEXT NOT NULL,
	"guild"	TEXT,
	"channel"	TEXT NOT NULL,
	"author"	TEXT NOT NULL,
	"query"	TEXT NOT NULL,
	"result"	TEXT,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("message", "query")
);
CREATE TABLE IF NOT EXISTS "searches2" (
	"message"	TEXT NOT NULL,
	"guild"	TEXT,
	"channel"	TEXT NOT NULL,
	"channel_type"	TEXT NOT NULL,
	"author"	TEXT NOT NULL,

	"search_type"	TEXT NOT NULL,
	"search_summon"	TEXT NOT NULL,
	"search_index"	TEXT NOT NULL,
	"search_full"	TEXT NOT NULL,

	"input_type"	TEXT,
	"input_language"	TEXT,
	"result_language"	TEXT,

	"result_card"	TEXT,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("message", "search_index")
);`);
		return db;
	}

	public writeCommand(interaction: ChatInputCommandInteraction | AutocompleteInteraction, latency: number): void {
		this.commandStatement.run(
			interaction.id,
			interaction.guildId,
			interaction.channelId,
			interaction.channel?.type,
			interaction.user.id,
			"context" in interaction ? interaction.context : null,
			"authorizingIntegrationOwners" in interaction
				? JSON.stringify(interaction.authorizingIntegrationOwners)
				: null,
			interaction.commandName,
			interaction.type,
			interaction.commandType,
			JSON.stringify(interaction.options.data),
			latency
		);
	}

	writeSearch(
		message: Message,
		summon: SearchSummon,
		searchResult?: SearchResult<Static<typeof CardSchema | typeof RushCardSchema>>
	): void {
		// searchResult: card lookup failed
		// searchResult.reply undefined: Discord reply failed
		// else normal operation
		if (message.author.id === process.env.HEALTHCHECK_BOT_SNOWFLAKE) {
			return;
		}
		let resultCard = null;
		if (searchResult?.card) {
			if ("password" in searchResult.card && searchResult.card.password) {
				resultCard = `${searchResult.card.password}`;
			} else if (searchResult.card.konami_id) {
				resultCard = `%${searchResult.card.konami_id}`;
			} else {
				resultCard = `${searchResult.card.name.en}`;
			}
		}
		const latency = searchResult?.reply ? searchResult.reply.createdTimestamp - message.createdTimestamp : -1;
		this.searchStatement.run(
			message.id,
			message.guildId,
			message.channelId,
			message.channel.type,
			message.author.id,

			summon.type,
			summon.summon,
			summon.index,
			summon.original,

			// Caveat: search failure results in these not being present
			// when only input language should be optional when searching by ID
			searchResult?.type,
			searchResult?.inputLanguage,
			searchResult?.resultLanguage,

			resultCard,
			latency
		);
	}

	public destroy(): void {
		this.db.close();
	}
}
