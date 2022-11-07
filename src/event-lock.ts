import sqlite, { Database, SqliteError, Statement } from "better-sqlite3";
import { inject, singleton } from "tsyringe";
import { getLogger } from "./logger";

/**
 * A "distributed" lock manager for received Discord gateway events.
 *
 * Relies on ACID guarantees from write-ahead-log SQLite to ensure that only one process
 * that has the lock database open may acquire a given lock. This is useful for
 * implementing zero-downtime deployments by starting the new process first before
 * stopping the old one while not having duplicate responses in the overlapping period.
 *
 * This is only "distributed" among concurrent Bastion processes on the same host.
 * For an actual distributed lock system across multiple hosts, use established solutions.
 * No mechanism is implemented for releasing locks, because events should only be
 * processed once.
 *
 * This system can also be toggled by Unix signals, to limit its use to the deployment
 * window for performance. Node.js uses both SIGUSR1 and SIGUSR2 (https://nodejs.org/api/process.html)
 * so the signals are based on Gunicorn (https://docs.gunicorn.org/en/stable/signals.html):
 * - SIGTTIN: enable
 * - SIGTTOU: disable and empty the lock database
 *
 * @see https://github.com/DawnbrandBots/bastion-bot/issues/194
 */
@singleton()
export class EventLocker {
	#logger = getLogger("locks");

	private readonly db: Database;
	private readonly insertStatement: Statement;
	private readonly deleteStatement: Statement;
	private isActive = true;
	private readonly onTTIN: NodeJS.SignalsListener;
	private readonly onTTOU: NodeJS.SignalsListener;

	constructor(@inject("locksDb") locksDb: string) {
		this.db = this.getDB(locksDb);
		this.insertStatement = this.db.prepare("INSERT INTO locks VALUES(?,?)");
		this.deleteStatement = this.db.prepare("DELETE FROM locks");
		// These are not declared as methods in the prototype because they need to be
		// both bound to this instance and have a reference that can be used in destroy()
		this.onTTIN = signal => {
			this.isActive = true;
			this.#logger.notify(signal);
		};
		this.onTTOU = signal => {
			this.isActive = false;
			this.#logger.notify(signal);
			this.deleteStatement.run();
		};
		process.on("SIGTTIN", this.onTTIN);
		process.on("SIGTTOU", this.onTTOU);
	}

	private getDB(locksDb: string): Database {
		const db = sqlite(locksDb);
		db.pragma("journal_mode = WAL");
		db.exec(`
CREATE TABLE IF NOT EXISTS "locks" (
	"id"	TEXT NOT NULL,
	"ns"	TEXT NOT NULL,
	PRIMARY KEY("id", "ns")
);`);
		return db;
	}

	/**
	 * Attempt to take a given lock. If this lock manager is disabled, always return true.
	 *
	 * @param id Lock identifier that is unique within the given namespace, like a message snowflake.
	 * @param namespace Scopes the provided lock identifiers.
	 * @returns whether we have the lock
	 */
	has(id: string, namespace: string): boolean {
		if (!this.isActive) {
			return true;
		}
		try {
			this.insertStatement.run(id, namespace);
			return true;
		} catch (error) {
			this.#logger.info(error);
			if (error instanceof SqliteError) {
				return false;
			} else {
				throw error;
			}
		}
	}

	destroy(): void {
		this.db.close();
		process.off("SIGTTIN", this.onTTIN);
		process.off("SIGTTOU", this.onTTOU);
	}
}
