import { Client } from "discord.js";

// const GALATEA = "256659631131066368";
const DAICHI = "309187464260485130";

describe("Message inline card search", () => {
	const singingLanius = new Client({ intents: [] });
	beforeAll(async () => await singingLanius.login());
	afterAll(async () => await singingLanius.destroy());
	it("searches for a single card in the default locale", async () => {
		const channel = await singingLanius.channels.fetch("934946926762274817");
		expect(channel?.isTextBased()).toEqual(true);
		if (channel?.isTextBased()) {
			const request = await channel.send("Come forth, <Blue-Eyes White Dragon>!");
			const responses = await channel.awaitMessages({ max: 1, time: 5000 });
			console.info(responses);
			expect(responses.size).toEqual(1);
			const message = responses.first();
			console.info(message);
			expect(message?.reference?.messageId).toEqual(request.id);
			expect(message?.author.id).toEqual(DAICHI);
			expect(message?.content).toBe("");
			expect(message?.embeds.length).toBeGreaterThanOrEqual(1);
		}
	});
});
