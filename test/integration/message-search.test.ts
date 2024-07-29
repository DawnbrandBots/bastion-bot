import { Client, GatewayIntentBits } from "discord.js";

const SINGLE_CARD_SEARCH_CASES = [
	{
		query: "Come forth, <Blue-Eyes White Dragon>!",
		name: "Blue-Eyes White Dragon",
		footer: "Password: 89631139 | Konami ID #4007"
	},
	{
		query: "so much <dork magician> legacy support",
		name: "Dark Magician",
		footer: "Password: 36996508 | Konami ID #4041"
	},
	{
		query: "<nirvana high paladin> has a lot of card text",
		name: "Nirvana High Paladin",
		embeds: 2,
		footer: "Password: 80896940 | Konami ID #12445"
	},
	{ query: "<raigeki,en,ja>", name: "サンダー・ボルト", footer: "パスワード: 12580477 | Konami ID #4343" },
	{
		query: "<baguette du monde,fr>",
		name: `World Legacy - "World Wand"`,
		footer: "Password: 93920420 | Konami ID #13904"
	},
	{
		query: "<Diabellstar la Bruja Negra,es>",
		name: "Diabellstar the Black Witch",
		footer: "Password: 72270339 | Konami ID #19148"
	},
	{
		query: "<%19092,de>",
		name: "Schwarz Glänzender Soldat",
		footer: "No password | Konami ID #19092\nPlaceholder ID: 10000100"
	},
	{
		query: "<%11927,it>",
		name: "Drago Alato di Ra - Modalità Sfera",
		footer: "No password | Konami ID #11927\nPlaceholder ID: 10000080"
	},
	{ query: "<10000,pt>", name: "Dragão dos Dez Mil", footer: "Senha: 10000 | Konami ID #14809" },
	{
		query: "<티아라멘츠 키토칼로스,ko>",
		name: "Tearlaments Kitkallos",
		footer: "Password: 92731385 | Konami ID #17444"
	},
	{
		query: "<론고미니언트,ko,ko>",
		name: "No.86 H－C 론고미언트（No.86 히로익 챔피언 론고미언트）",
		footer: "패스워드: 63504681 | 코나미 ID #11296"
	},
	{
		query: "<어라이즈하트,ko,ja>",
		name: "クシャトリラ・アライズハート",
		footer: "パスワード: 48626373 | Konami ID #18191"
	},
	{
		query: "<ダークマター,ja>",
		name: "Number 95: Galaxy-Eyes Dark Matter Dragon",
		footer: "Password: 58820923 | Konami ID #11651"
	},
	{
		query: "<魔妖不知火物語,ja>",
		name: "Ghost Meets Girl - A Masterful Mayakashi Shiranui Saga",
		footer: "Password: 62219643 | Konami ID #17036"
	},
	{ query: "<バロネス,ja,ja>", name: "フルール・ド・バロネス", footer: "パスワード: 84815190 | Konami ID #16386" },
	{ query: "<究極融合,zh-TW>", name: "Ultimate Fusion", footer: "Password: 71143015 | Konami ID #16856" },
	{
		query: "<魔妖不知火语,zh-CN,zh-CN>",
		name: "逢华妖丽谭－魔妖不知火语",
		footer: "卡片密码: 62219643 | 官方编号17036"
	},
	{ query: "<sevens road magician>Rush Duel search!", name: "Sevens Road Magician", footer: "Konami ID #15150" },
	{ query: "r<metalstrike asurastar>", name: "Metarion Ashurastar", footer: "Konami ID #16886" },
	{ query: "<Fusion,en,ja>R", name: "フュージョン", footer: "Konami ID #16934" },
	{ query: "R<15184,fr>", name: "Dragon Blanc aux Yeux Bleus", footer: "Konami ID #15184" },
	{ query: "r<%16371>", name: "Dark Magician Girl", footer: "Konami ID #16371" },
	{ query: "r<17980>", name: "Heavy Storm", footer: "Konami ID #17980" },
	{ query: "<16372,de>r", name: "Topf der Gier", footer: "Konami ID #16372" },
	{ query: "<19342,ja>r", name: "攻撃の無力化（こうげきのむりょくか）", footer: "Konami ID #19342" },
	{ query: "<16954>r", name: "Mirror Force", footer: "Konami ID #16954" },
	{ query: "<푸른 눈의 백룡,ko>러", name: "Blue-Eyes White Dragon", footer: "Konami ID #15184" },
	{ query: "러<낙오자 사역마,ko,ko>", name: "낙오자 사역마", footer: "코나미 ID #15159" },
	{ query: "r<ブラック・マジシャン・ガール,ja,ja>", name: "ブラック・マジシャン・ガール", footer: "Konami ID #16371" }
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
		async ({ query, name, embeds = 1, footer }) => {
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
				expect(message?.embeds[message.embeds.length - 1].footer?.text).toEqual(footer);
			}
		},
		10000
	);
});
