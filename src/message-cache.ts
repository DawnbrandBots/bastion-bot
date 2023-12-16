import { Message, Snowflake } from "discord.js";
import { getLogger } from "./logger";

/**
 * In-memory key-value store used by SearchMessageListener to store recent <> card searches
 * so that MessageDeleteListener can delete Bastion's replies
 * if the searcher's message is deleted within a specified interval.
 */
export class RecentMessageCache {
	#logger = getLogger("message-cache");

	// This could also store the message objects
	protected map: Map<Snowflake, { createdTimestamp: number; replies: Snowflake[] }> = new Map();
	protected interval: NodeJS.Timeout;

	constructor(
		protected ttlMilliseconds: number,
		sweepIntervalMilliseconds: number
	) {
		this.interval = setInterval(() => this.sweep(), sweepIntervalMilliseconds).unref();
	}

	set(message: Message, replies: Snowflake[]): void {
		this.map.set(message.id, {
			createdTimestamp: message.createdTimestamp,
			replies
		});
	}

	get(message: Snowflake): Snowflake[] | undefined {
		const entry = this.map.get(message);
		if (!entry) {
			return;
		}
		if (entry.createdTimestamp + this.ttlMilliseconds < Date.now()) {
			this.#logger.info(`get expired after ${this.ttlMilliseconds} ms: ${entry}`);
			this.map.delete(message);
			return;
		}
		return entry.replies;
	}

	delete(message: Snowflake): void {
		this.map.delete(message);
	}

	protected sweep(): void {
		this.#logger.info(`sweep on ${this.map.size} entries`);
		for (const [message, { createdTimestamp }] of this.map) {
			if (createdTimestamp + this.ttlMilliseconds < Date.now()) {
				// This is safe to do in the loop as maps have guaranteed order
				this.map.delete(message);
			}
		}
		this.#logger.info(`sweep finished leaving ${this.map.size} entries`);
	}

	/**
	 * Use to clean up this object, after which it should not be used.
	 */
	finalise(): void {
		clearInterval(this.interval);
		this.map.clear();
	}
}
