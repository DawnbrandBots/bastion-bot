import { Message } from "discord.js";
import { injectable } from "tsyringe";
import { Listener } from ".";
import { getLogger } from "../logger";

@injectable()
export class MessageListener implements Listener<"message"> {
    readonly type = "message";

    #logger = getLogger("events:message");

    async run(message: Message): Promise<void> {
        if (message.author.bot || message.reference) {
            return;
        }
        if (message.client.user && message.mentions.has(message.client.user)) {
            try {
                const ping = message.client.ws.ping;
                const response = await message.reply(`WebSocket ping: ${ping} ms`);
                const latency = response.createdTimestamp - message.createdTimestamp;
                await response.edit(`${response.content}\nTotal latency: ${latency} ms`);
                this.#logger.verbose(
                    JSON.stringify({
                        channel: message.channel.id,
                        message: message.id,
                        guild: message.guild?.id,
                        author: message.author.id,
                        ping,
                        latency
                    })
                );
            } catch (error) {
                this.#logger.error(
                    JSON.stringify({
                        channel: message.channel.id,
                        message: message.id,
                        guild: message.guild?.id,
                        author: message.author.id,
                        content: message.content
                    }),
                    error
                );
            }
        }
    }
}
