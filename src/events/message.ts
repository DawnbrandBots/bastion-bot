import { Debugger } from "debug";
import { Message } from "discord.js";
import { Listener } from ".";

export class MessageListener implements Listener<"message"> {
    constructor(private log: Debugger) {}

    async run(message: Message): Promise<void> {
        if (message.author.bot || message.reference) {
            return;
        }
        if (message.client.user && message.mentions.has(message.client.user)) {
            try {
                const response = await message.reply(`WebSocket ping: ${message.client.ws.ping} ms`);
                const latency = response.createdTimestamp - message.createdTimestamp;
                await response.edit(`${response.content}\nTotal latency: ${latency} ms`);
            } catch (error) {
                this.log(
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
