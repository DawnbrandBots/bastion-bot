import debug from "debug";
import { Got } from "got";
import { MasterDuelCardUsage, MasterDuelTier, MetagameClient, TopResponse } from "../../src/commands/metagame";
import { Price, PriceClient } from "../../src/commands/price";
import createGotClient from "../../src/got";

let got: Got;

beforeAll(() => {
	debug.enable("bot:*");
	got = createGotClient();
});

describe("YGOPRODECK getCardPrices API contract", () => {
	let client: PriceClient;

	beforeAll(() => {
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

describe("YGOPRODECK metagame API contracts", () => {
	let client: MetagameClient;

	beforeAll(() => {
		client = new MetagameClient(got);
	});

	test.each(["TCG", "OCG", "OCG-AE"])("/api/tournament/getTopArchetypes.php with format=%s", async format => {
		const tops = await client.getTops(format);
		expect(tops.format).toEqual(format);
		expect(tops.total).toBeGreaterThan(0);
		expect(tops.dateCutoffEnd).toBeDefined();
		expect(Date.parse(tops.dateCutoffStart)).not.toBeNaN();
		expect(Array.isArray(tops.archetypes)).toBe(true);
		expect(tops.archetypes.length).toBeGreaterThan(0);
		for (const strategy of tops.archetypes) {
			expect(strategy).toEqual(
				expect.objectContaining<TopResponse["archetypes"][0]>({
					arch_1: expect.stringMatching(/./),
					quantity: expect.any(Number),
					arch_1_img: expect.any(Number),
					archetypeTierPage: expect.stringMatching(/./)
				})
			);
			expect(strategy.quantity).toBeGreaterThan(0);
			expect(strategy.arch_1_img).toBeGreaterThan(0);
		}
	});

	test("/api/master-duel/card-usage.php", async () => {
		const usage = await client.getMasterDuelCardUsage();
		expect(Array.isArray(usage)).toBe(true);
		expect(usage.length).toBeGreaterThan(0);
		for (const card of usage) {
			expect(card).toEqual(
				expect.objectContaining<MasterDuelCardUsage>({
					name: expect.stringMatching(/./),
					id: expect.any(Number),
					win_count: expect.any(Number),
					loss_count: expect.any(Number),
					win_ratio: expect.any(Number),
					duel_count: expect.any(Number),
					placement: expect.any(Number),
					season: expect.any(Number),
					game_mode: expect.stringMatching(/./),
					pretty_url: expect.stringMatching(/./),
					rarity: expect.stringMatching(/./)
				})
			);
			expect(card.id).toBeGreaterThan(0);
			expect(card.win_count).toBeGreaterThan(0);
			expect(card.loss_count).toBeGreaterThan(0);
			expect(card.win_ratio).toBeGreaterThanOrEqual(0);
			expect(card.win_ratio).toBeLessThanOrEqual(1);
			expect(card.duel_count).toBeGreaterThan(0);
			expect(card.placement).toBeGreaterThan(0);
			expect(card.season).toBeGreaterThan(0);
		}
	});

	test("/api/master-duel/tier-list.php", async () => {
		const tierList = await client.getMasterDuelTierList();
		expect(Array.isArray(tierList)).toBe(true);
		expect(tierList.length).toBeGreaterThan(0);
		for (const strategy of tierList) {
			expect(strategy).toEqual(
				expect.objectContaining<MasterDuelTier>({
					tier: expect.any(Number),
					season: expect.any(Number),
					game_mode: expect.stringMatching(/./),
					archetype_name: expect.stringMatching(/./),
					win_count: expect.any(Number),
					loss_count: expect.any(Number),
					win_ratio: expect.stringMatching(/./),
					duel_count: expect.any(Number),
					rank_weighted_score: expect.any(Number),
					average_turn_count: expect.stringMatching(/./),
					median_turn_count: expect.stringMatching(/./)
				})
			);
			expect(strategy.season).toBeGreaterThan(0);
			expect(strategy.win_count).toBeGreaterThan(0);
			expect(strategy.loss_count).toBeGreaterThan(0);
			expect(parseFloat(strategy.win_ratio)).not.toBeNaN();
			expect(strategy.duel_count).toBeGreaterThan(0);
			expect(parseFloat(strategy.average_turn_count)).not.toBeNaN();
			expect(parseFloat(strategy.median_turn_count)).not.toBeNaN();
		}
	});
});

describe("YGOPRODECK redirection", () => {
	test.todo("OCG/TCG card");
	test.todo("Rush Duel card");
	test.todo("Deck builder");
});
