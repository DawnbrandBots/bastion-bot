import debug from "debug";
import { Got } from "got";
import { Price, PriceClient } from "../../src/commands/price";
import createGotClient from "../../src/got";

describe("YGOPRODECK getCardPrices API contract", () => {
	let got: Got;
	let client: PriceClient;

	beforeAll(() => {
		debug.enable("bot:*");
		got = createGotClient();
		client = new PriceClient(got);
	});

	test.each([
		["tcgplayer", "Ash Blossom & Joyous Spring"],
		["cardmarket", "Infinite Impermanence"]
	] as const)("returns %s card prices for [%s]", async (store, name) => {
		const prices = await client.get(name, store);
		expect(Array.isArray(prices)).toBe(true);
		expect(prices.length).toBeGreaterThan(0);
		for (const printing of prices) {
			expect(printing).toEqual(
				expect.objectContaining<Price>({
					set_name: expect.stringMatching(/./),
					set_code: expect.stringMatching(/./),
					set_rarity: expect.stringMatching(/./),
					set_price: expect.stringMatching(/\d+\.\d\d/),
					set_url: expect.stringMatching(/^https:\/\/.+/),
					set_edition: expect.stringMatching(/./)
				})
			);
			const price = Number(printing.set_price);
			expect(price).toBeGreaterThan(0);
			// Should parse and not throw TypeError: Invalid URL (code: ERR_INVALID_URL)
			new URL(printing.set_url);
		}
	});

	test.each([
		["tcgplayer", "asdasdasd"],
		["cardmarket", "asdasdasd"]
	] as const)("returns empty array for non-TCG cards (%s)", async (store, name) => {
		const prices = await client.get(name, store);
		expect(Array.isArray(prices)).toBe(true);
		expect(prices.length).toBe(0);
	});
});
