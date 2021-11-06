import sqlite, { Database, Statement } from "better-sqlite3";
import { CommandInteraction } from "discord.js";
import * as fs from "fs";
import { injectable } from "tsyringe";

const metricsDbPath = `${__dirname}/../stats/stats.db3`;

@injectable()
export class Metrics {
	private db: Database;
	private commandStatement: Statement;
	constructor() {
		this.db = this.getDB();
		this.commandStatement = this.db.prepare("INSERT INTO commands VALUES(?,?,?,?,?,?,?)");
	}

	private getDB(): Database {
		const init = !fs.existsSync(metricsDbPath); // async version is deprecated
		const db = sqlite(metricsDbPath);
		if (init) {
			// synchronous fs for one-time init step
			const dump = fs.readFileSync(`${__dirname}/../stats/stats.db3.sql`, "utf8");
			db.exec(dump);
		}
		db.pragma("journal_mode = WAL");
		return db;
	}

	public writeCommand(interaction: CommandInteraction, latency: number): void {
		const id = interaction.id;
		const guild = interaction.guild?.id;
		const channel = interaction.channel?.id;
		const author = interaction.user.id;
		const command = interaction.commandName;
		const args = interaction.options.data.join();
		this.commandStatement.run(id, guild, channel, author, command, args, latency);
	}
}
