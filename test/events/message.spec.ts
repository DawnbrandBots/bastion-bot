import { debug } from "debug";
import { Message } from "discord.js";
import { MessageListener } from "../../src/events";

const { Message: MockMessage, MessageMentions } = jest.createMockFromModule("discord.js");

describe("Message event listener", () => {
    const listener = new MessageListener(debug(""));

    let message: Message;
    const user = {};
    beforeEach(() => {
        message = new MockMessage();
        Object.defineProperty(message, "author", { value: { bot: false } });
        Object.defineProperty(message, "client", {
            value: {
                user,
                ws: { ping: 0 }
            }
        });
        message.mentions = new MessageMentions();
        message.mentions.has = jest.fn(thing => thing === user);
        message.createdTimestamp = 0;
        message.reply = jest.fn(async () => message);
        message.edit = jest.fn();
    });

    test("ignores bots", async () => {
        message.author.bot = true;

        await listener.run(message);
        expect(message.reply).not.toHaveBeenCalled();
    });

    test("ignores replies", async () => {
        message.reference = {
            guildID: "0",
            channelID: "1",
            messageID: "0"
        };

        await listener.run(message);
        expect(message.reply).not.toHaveBeenCalled();
    });

    test("only responds to mentions", async () => {
        message.mentions.has = jest.fn(() => false);

        await listener.run(message);
        expect(message.reply).not.toHaveBeenCalled();
    });

    test("responds to mentions with the latency", async () => {
        await listener.run(message);
        expect(message.reply).toHaveBeenCalledTimes(1);
        expect(message.edit).toHaveBeenCalledTimes(1);
    });

    test("handles exceptions", async () => {
        message.reply = jest.fn(() => {
            throw new Error();
        });
        Object.defineProperty(message, "channel", { value: { id: "0" } });

        await listener.run(message);
        expect(message.reply).toHaveBeenCalledTimes(1);
    });
});
