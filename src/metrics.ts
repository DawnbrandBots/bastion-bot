import sqlite, { Database, Statement } from "better-sqlite3";
import { ChatInputCommandInteraction, Message } from "discord.js";
import { inject, singleton } from "tsyringe";

@singleton()
export class Metrics {
	private readonly db: Database;
	private readonly commandStatement: Statement;
	private readonly searchStatement: Statement;
	constructor(@inject("metricsDb") metricsDb: string) {
		this.db = this.getDB(metricsDb);
		this.commandStatement = this.db.prepare("INSERT INTO commands VALUES(?,?,?,?,?,?,?)");
		this.searchStatement = this.db.prepare("INSERT INTO searches VALUES(?,?,?,?,?,?,?)");
	}

	private getDB(metricsDb: string): Database {
		const db = sqlite(metricsDb);
		db.pragma("journal_mode = WAL");
		db.exec(`
CREATE TABLE IF NOT EXISTS "commands" (
	"id"	TEXT NOT NULL,
	"guild"	TEXT,
	"channel"	TEXT NOT NULL,
	"author" 	TEXT NOT NULL,
	"command"	TEXT NOT NULL,
	"args"	TEXT NOT NULL,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "searches" (
	"message"	TEXT NOT NULL,
	"guild"	TEXT,
	"channel"	TEXT NOT NULL,
	"author" 	TEXT NOT NULL,
	"query"	TEXT NOT NULL,
	"result"	TEXT,
	"latency"	INTEGER NOT NULL,
	PRIMARY KEY("message", "query")
);`);
		return db;
	}

	public writeCommand(interaction: ChatInputCommandInteraction, latency: number): void {
		const id = interaction.id;
		const guild = interaction.guild?.id;
		const channel = interaction.channel?.id;
		const author = interaction.user.id;
		const command = interaction.commandName;
		const args = JSON.stringify(interaction.options.data);
		this.commandStatement.run(id, guild, channel, author, command, args, latency);
	}

	public writeSearch(message: Message, query: string, result: string, latency: number): void {
		const id = message.id;
		const guild = message.guild?.id;
		const channel = message.channel?.id;
		const author = message.author.id;
		this.searchStatement.run(id, guild, channel, author, query, result, latency);
	}

	public destroy(): void {
		this.db.close();
	}
}
