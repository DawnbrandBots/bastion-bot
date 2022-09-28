import { Message } from "discord.js";
import { injectable } from "tsyringe";
import { Listener } from ".";
import { getLogger } from "../logger";
import { RecentMessageCache } from "../message-cache";

@injectable()
export class MessageDeleteListener implements Listener<"messageDelete"> {
	readonly type = "messageDelete";

	#logger = getLogger("events:message:delete");

	constructor(private recentCache: RecentMessageCache) {}

	async run(message: Message): Promise<void> {
		const responses = this.recentCache.get(message.id);
		if (responses) {
			this.#logger.info(`${message.id}: ${responses}`);
			await Promise.allSettled(
				responses.map(snowflake =>
					message.channel.messages
						.delete(snowflake)
						.catch(error => this.#logger.info(`${message.id}: (${snowflake}) ${error}`))
				)
			);
			this.recentCache.delete(message.id);
		}
	}
}
