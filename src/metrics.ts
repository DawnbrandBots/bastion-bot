import sqlite from "better-sqlite3";
import * as fs from "fs";
import { Message, GuildChannel, CommandInteraction } from "discord.js";

const metricsDbPath = __dirname + "/../stats/stats.db3";

class Metrics {
	private db: Promise<sqlite.Database>;
	constructor() {
		this.db = this.getDB();
	}

	private async getDB(): Promise<sqlite.Database> {
		const init = !fs.existsSync(metricsDbPath); // async version is deprecated
		const db = sqlite(metricsDbPath);
		if (init) {
			const dump = await fs.promises.readFile(__dirname + "/../stats/stats.db3.sql", "utf8");
			db.exec(dump);
		}
		return db;
	}

	public async writeCommand(interaction: CommandInteraction): Promise<void> {
		const db = await this.db;
		const statement = db.prepare("INSERT INTO commands VALUES(?,?,?,?,?)");
		// TODO: the choice of properties are inspired by serialiseCommand - is there any way to reuse code here?
		const channel = interaction.channel?.id;
		const message = interaction.id;
		const guild = interaction.guild?.id;
		const author = interaction.user.id;
		const id = interaction.commandId;
		const command = interaction.commandName;
		statement.run(channel, message, guild, author, id, command);
	}
}

export const metrics = new Metrics();
