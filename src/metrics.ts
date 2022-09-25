import sqlite, { Database, Statement } from "better-sqlite3";
import { ChatInputCommandInteraction } from "discord.js";
import { inject, singleton } from "tsyringe";

@singleton()
export class Metrics {
	private readonly db: Database;
	private readonly commandStatement: Statement;
	constructor(@inject("metricsDb") metricsDb: string) {
		this.db = this.getDB(metricsDb);
		this.commandStatement = this.db.prepare("INSERT INTO commands VALUES(?,?,?,?,?,?,?)");
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

	public destroy(): void {
		this.db.close();
	}
}
