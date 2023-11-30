import { Message } from "discord.js";
import { RecentMessageCache } from "../../src/message-cache";

describe("RecentMessageCache", () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});
	afterAll(() => {
		jest.useRealTimers();
	});

	// Discord epoch, 2015 first second
	const createdTimestamp = 1420070400000;
	let cache: RecentMessageCache;
	beforeEach(() => {
		jest.setSystemTime(createdTimestamp);
		cache = new RecentMessageCache(1000, 10000);
	});
	afterEach(() => {
		cache.finalise();
		jest.clearAllTimers();
	});

	test("sets and gets", () => {
		cache.set({ id: "foo", createdTimestamp } as Message, []);
		expect(cache.get("foo")).toEqual([]);
	});

	test("deletes", () => {
		cache.set({ id: "foo", createdTimestamp } as Message, []);
		cache.delete("foo");
		expect(cache.get("foo")).toBeUndefined();
	});

	test("does not return expired entries", () => {
		cache.set({ id: "foo", createdTimestamp } as Message, []);
		jest.setSystemTime(createdTimestamp + 1001);
		expect(cache.get("foo")).toBeUndefined();
	});

	test("regularly cleans up expired entries", () => {
		const createdTimestamp = Date.now();
		cache.set({ id: "foo", createdTimestamp } as Message, []);
		jest.advanceTimersToNextTimer();
		expect(cache["map"].size).toBe(0);
	});
});
