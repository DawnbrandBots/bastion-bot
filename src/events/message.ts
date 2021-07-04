import { ClientEvents } from "discord.js";
import { EventListenerFactory } from ".";

export const createMessageListener: EventListenerFactory<ClientEvents["message"]> = log => async message => {
    if (message.author.bot || message.reference) {
        return;
    }
    if (message.client.user && message.mentions.has(message.client.user)) {
        try {
            const response = await message.reply(`WebSocket ping: ${message.client.ws.ping} ms`);
            const latency = response.createdTimestamp - message.createdTimestamp;
            await response.edit(`${response.content}\nTotal latency: ${latency} ms`);
        } catch (error) {
            log(
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
};
