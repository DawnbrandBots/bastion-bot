import { Message } from "discord.js";
import { injectable } from "tsyringe";
import { Listener } from ".";
import { getLogger } from "../logger";

@injectable()
export class MessageListener implements Listener<"messageCreate"> {
    readonly type = "messageCreate";

    #logger = getLogger("events:message");

    readonly BASE_MESSAGE = `
${process.env.BOT_MOTD}\n\nCreated by __AlphaKretin#7990__. \`/help\` to learn more.
Free and open-source under the GNU AGPL 3.0.`;

    async run(message: Message): Promise<void> {
        if (message.author.bot || message.reference) {
            return;
        }
        if (message.client.user && message.mentions.has(message.client.user)) {
            try {
                const ping = message.client.ws.ping;
                const response = await message.reply(`${this.BASE_MESSAGE}\n\nWebSocket ping: ${ping} ms`);
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
