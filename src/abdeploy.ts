import { Snowflake } from "discord.js";
import { readFile } from "fs/promises";
import { inject, singleton } from "tsyringe";
import { getLogger } from "./logger";

@singleton()
export class ABDeploy {
	#logger = getLogger("abdeploy");

	protected interval: NodeJS.Timer;
	protected registry: Set<Snowflake> | null = null;

	constructor(@inject("abdeployJson") private file: string) {
		// Promise can resolve after constructor, just don't until next trigger to populate
		this.update(true);
		this.interval = setInterval(() => this.update(), 60000).unref();
	}

	protected async update(initial = false): Promise<void> {
		// Synchronise on the hour
		if (initial || new Date().getMinutes() === 0) {
			this.#logger.info(`Updating from ${this.file}`);
			try {
				const json = await readFile(this.file, { encoding: "utf8" });
				this.registry = new Set(JSON.parse(json));
				this.#logger.info(`Read ${this.registry.size} entries`);
			} catch (error) {
				// Info level because file may not exist and this is okay
				this.#logger.info(error);
			}
		}
	}

	has(server: Snowflake): boolean {
		return !!this.registry?.has(server);
	}

	/**
	 * Use to clean up this object, after which it should not be used.
	 */
	finalise(): void {
		clearInterval(this.interval);
		this.registry = null;
	}
}
