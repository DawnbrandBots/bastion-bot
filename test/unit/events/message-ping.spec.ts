import { Message } from "discord.js";
import { PingMessageListener } from "../../../src/events";
import { Locale, LocaleProvider } from "../../../src/locale";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Message: MockMessage, MessageMentions } = jest.createMockFromModule<any>("discord.js");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { EventLocker: MockEventLocker } = jest.createMockFromModule<any>("../../../src/event-lock");

class MockLocaleProvider extends LocaleProvider {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async guild(id: string): Promise<Locale | null> {
		return "en";
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async channel(id: string): Promise<Locale | null> {
		return "en";
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setForGuild(id: string, set: Locale | null): Promise<void> {
		throw new Error("Method not implemented.");
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setForChannel(id: string, set: Locale | null): Promise<void> {
		throw new Error("Method not implemented.");
	}
}

describe("Message event listener", () => {
	const eventLocks = new MockEventLocker();
	jest.spyOn(eventLocks, "has").mockImplementation(() => true);
	const listener = new PingMessageListener(new MockLocaleProvider(), eventLocks);

	let message: Message;
	const user = {};
	beforeEach(() => {
		message = new MockMessage();
		Object.defineProperty(message, "channel", { value: { id: "0" } });
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
			guildId: "0",
			channelId: "1",
			messageId: "0"
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

		await listener.run(message);
		expect(message.reply).toHaveBeenCalledTimes(1);
	});
});
