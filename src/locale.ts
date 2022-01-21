import sqlite, { Database, Statement } from "better-sqlite3";
import { Snowflake } from "discord.js";
import { inject, singleton } from "tsyringe";

export type Locale = string | null;

/**
 * Abstract persistent store for locale overrides. We need this if we switch to
 * multiprocess sharding in the future and demand is high, since SQLite cannot
 * handle concurrent writes. Promise?
 */
export interface LocaleProvider {
	guild(id: Snowflake): Promise<Locale>;
	channel(id: Snowflake): Promise<Locale>;
	setForGuild(id: Snowflake, set: Locale): Promise<void>;
	setForChannel(id: Snowflake, set: Locale): Promise<void>;
}

@singleton()
export class SQLiteLocaleProvider implements LocaleProvider {
	private readonly db: Database;
	private readonly readGuild: Statement;
	private readonly writeGuild: Statement;
	private readonly deleteGuild: Statement;
	private readonly readChannel: Statement;
	private readonly writeChannel: Statement;
	private readonly deleteChannel: Statement;
	constructor(@inject("localeDb") file: string) {
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

	public async guild(id: Snowflake): Promise<Locale> {
		return this.readGuild.get(id)?.locale || null;
	}

	public async channel(id: Snowflake): Promise<Locale> {
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
