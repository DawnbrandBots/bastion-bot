import { Client, GatewayIntentBits } from "discord.js";

const SINGLE_CARD_SEARCH_CASES = [
	{ query: "Come forth, <Blue-Eyes White Dragon>!", name: "Blue-Eyes White Dragon" },
	{ query: "so much <dork magician> legacy support", name: "Dark Magician" },
	{ query: "<nirvana high paladin> has a lot of card text", name: "Nirvana High Paladin", embeds: 2 },
	{ query: "<raigeki,en,ja>", name: "サンダー・ボルト" },
	{ query: "<baguette du monde,fr>", name: `World Legacy - "World Wand"` },
	{ query: "<Diabellstar la Bruja Negra,es>", name: "Diabellstar the Black Witch" },
	{ query: "<%19092,de>", name: "Schwarz Glänzender Soldat" },
	{ query: "<%11927,it>", name: "Drago Alato di Ra - Modalità Sfera" },
	{ query: "<10000,pt>", name: "Dragão dos Dez Mil" },
	{ query: "<티아라멘츠 키토칼로스,ko>", name: "Tearlaments Kitkallos" },
	{ query: "<론고미니언트,ko,ko>", name: "No.86 H－C 론고미언트（No.86 히로익 챔피언 론고미언트）" },
	{ query: "<어라이즈하트,ko,ja>", name: "クシャトリラ・アライズハート" },
	{ query: "<ダークマター,ja>", name: "Number 95: Galaxy-Eyes Dark Matter Dragon" },
	{ query: "<魔妖不知火物語,ja>", name: "Ghost Meets Girl - A Masterful Mayakashi Shiranui Saga" },
	{ query: "<バロネス,ja,ja>", name: "フルール・ド・バロネス" },
	{ query: "<究極融合,zh-TW>", name: "Ultimate Fusion" },
	{ query: "<魔妖不知火语,zh-CN,zh-CN>", name: "逢华妖丽谭－魔妖不知火语" }
];

describe("Message inline card search", () => {
	const singingLanius = new Client({ intents: [GatewayIntentBits.GuildMessages] });
	singingLanius.on("warn", console.warn);
	singingLanius.on("error", console.error);
	singingLanius.on("ready", () =>
		console.info(`Logged in as ${singingLanius.user?.tag} - ${singingLanius.user?.id}`)
	);
	beforeAll(async () => await singingLanius.login());
	afterAll(async () => await singingLanius.destroy());
	test.each(SINGLE_CARD_SEARCH_CASES)(
		"$name is returned for: $query",
		async ({ query, name, embeds = 1 }) => {
			const channel = await singingLanius.channels.fetch(`${process.env.TARGET_CHANNEL}`);
			expect(channel?.isTextBased()).toEqual(true);
			if (channel?.isTextBased()) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				const request = await channel.send(query);
				const responses = await channel.awaitMessages({
					filter: message => message.author.id === process.env.TARGET_BOT,
					max: 1,
					time: 5000
				});
				console.info(responses);
				expect(responses.size).toEqual(1);
				const message = responses.first();
				console.info(JSON.stringify(message?.embeds));
				expect(message?.reference?.messageId).toEqual(request.id);
				expect(message?.content).toBe("");
				expect(message?.embeds.length).toEqual(embeds);
				expect(message?.embeds[0].title).toEqual(name);
			}
		},
		10000
	);
});
