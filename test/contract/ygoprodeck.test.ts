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

	test.each(
		[
			"Dark Magician",
			"Blue-Eyes White Dragon",
			"The Winged Dragon of Ra",
			"S:P Little Knight",
			"Ash Blossom & Joyous Spring",
			"Raigeki",
			"Called by the Grave",
			"Infinite Impermanence",
			"32909498", // Kashtira Fenrir
			// "74875003", // Ra's Disciple
			"85327820", // A.I.'s Ritual
			"83764718", // Monster Reborn
			"68462976", // Secret Village of the Spellcasters
			"30748475", // Destructive Daruma Karma Cannon
			"20899496", // Ice Dragon's Prison
			// Fake passwords
			"10000000", // Obelisk the Tormentor
			"10000020", // Slifer the Sky Dragon
			"10000080" // The Winged Dragon of Ra - Sphere Mode
		]
			.map(
				name =>
					[
						["tcgplayer", name],
						["cardmarket", name]
					] as const
			)
			.flat()
	)("returns %s card prices for [%s]", async (store, name) => {
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
			// Reported prices above 1000 are formatted with commas, e.g. 1,731.23
			const price = Number(printing.set_price.replace(",", ""));
			// 0.00 indicates unknown price
			expect(price).toBeGreaterThanOrEqual(0);
			// Should parse and not throw TypeError: Invalid URL (code: ERR_INVALID_URL)
			new URL(printing.set_url);
		}
	});

	test.each([
		["tcgplayer", "asdasdasd"],
		["cardmarket", "asdasdasd"]
	] as const)("does not return prices for non-TCG cards (%s)", async (store, name) => {
		const prices = await client.get(name, store);
		expect(prices).toBeFalsy();
	});
});

describe("YGOPRODECK redirection", () => {
	test.todo("OCG/TCG card");
	test.todo("Rush Duel card");
	test.todo("Deck builder");
});
