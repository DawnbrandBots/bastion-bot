import { Static } from "@sinclair/typebox";
import { MessageEmbed } from "discord.js";
import { CardSchema } from "./definitions";
import fetch from "./fetch";

const Colour = {
	Token: 0x8d8693,
	Spell: 0x1d9e74,
	Trap: 0xbc5a84,
	Fusion: 0xa086b7,
	Ritual: 0x6699ff,
	Synchro: 0xe8e8e6,
	Xyz: 0x2d2f33,
	Link: 0x1f11b2,
	Skill: 0x4287f5,
	Normal: 0xfde68a,
	Orange: 0xff8b53
};

const RaceIcon = {
	Warrior: "<:Warrior:602707927224025118>",
	Spellcaster: "<:Spellcaster:602707926834085888>",
	Fairy: "<:Fairy:602707926200614912>",
	Fiend: "<:Fiend:602707926850732035>",
	Zombie: "<:Zombie:602707927102390292>",
	Machine: "<:Machine:602707926733291521>",
	Aqua: "<:Aqua:602707887931785238>",
	Pyro: "<:Pyro:602707925793767427>",
	Rock: "<:Rock:602707926213460010>",
	"Winged Beast": "<:WingedBeast:602707926464987138>",
	Plant: "<:Plant:602707792138076186>",
	Insect: "<:Insect:602707926146088960>",
	Thunder: "<:Thunder:602707927484203013>",
	Dragon: "<:Dragon:602707926901325834>",
	Beast: "<:Beast:602707889018372109>",
	"Beast-Warrior": "<:BeastWarrior:602707890171543593>",
	Dinosaur: "<:Dinosaur:602713887141527563>",
	Fish: "<:Fish:602707925877915659>",
	"Sea Serpent": "<:SeaSerpent:602707926288826378>",
	Reptile: "<:Reptile:602707927219830784>",
	Psychic: "<:Psychic:602707926767108129>",
	"Divine-Beast": "<:DivineBeast:602707925730852874>",
	"Creator-God": "<:CreatorGod:602707927219961866>", // TODO: should not be hyphenated
	Wyrm: "<:Wyrm:602707927068835884>",
	Cyberse: "<:Cyberse:602707927421157376>"
	//Yokai: "<:Yokai:602707927932993546>",
	//Charisma: "<:Charisma:602707891530629130>"
};

const AttributeIcon = {
	EARTH: "<:EARTH:602707925726658570>",
	WATER: "<:WATER:602707927341596691>",
	FIRE: "<:FIRE:602707928255954963>",
	WIND: "<:WIND:602707926771171348>",
	LIGHT: "<:LIGHT:602707926183968768>",
	DARK: "<:DARK:602707926792273920>",
	DIVINE: "<:DIVINE:602707926594879498>",
	LAUGH: "<:LAUGH:602719132567207938>"
};

const Icon = {
	Spell: "<:SPELL:623021653580054538>",
	Trap: "<:TRAP:623021653810741258> ",
	Ritual: "<:Ritual:602707927274487838>",
	"Quick-Play": "<:QuickPlay:602707927073030150> ",
	Continuous: "<:Continuous:602707892507770891>",
	Equip: "<:Equip:602707925886042119> ",
	Field: "<:FIELD:602707926834216963> ",
	Counter: "<:Counter:602707928075599872>",
	//Link: "<:LinkSpell:602707598164099104>",
	LeftScale: "<:ScaleLeft:602710168337121290>",
	RightScale: "<:ScaleRight:602710170430210048>",
	Level: "<:level:602707925949087760>",
	Rank: "<:rank:602707927114973185>"
};

export async function getCard(
	type: "password" | "kid" | "name",
	input: string
): Promise<Static<typeof CardSchema> | undefined> {
	let url = `${process.env.SEARCH_API}`; // treated as string instead of string? without forbidden non-null check
	input = encodeURIComponent(input);
	if (type === "password") {
		url += `/card/password/${input}`;
	} else if (type === "kid") {
		url += `/card/kid/${input}`;
	} else {
		url += `/search?name=${input}`;
	}
	const response = await fetch(url);
	// 400: Bad syntax, 404: Not found
	if (response.status === 400 || response.status === 404) {
		return undefined;
	}
	// 200: OK
	if (response.status === 200) {
		return await response.json();
	}
	throw new Error((await response.json()).message);
}

export function createCardEmbed(
	card: Static<typeof CardSchema>,
	lang: "en" | "fr" | "de" | "it" | "pt"
): MessageEmbed[] {
	// TODO: localize labels based on language
	const embed = new MessageEmbed()
		.setTitle(card[lang]?.name || card.en.name)
		.setURL(`https://db.ygoprodeck.com/card/?search=${card.password}`)
		.setThumbnail(`${process.env.IMAGE_HOST}/${card.password}.png`);

	// TODO: expand with hyperlinks
	if (card.type === "Monster") {
		embed.setColor(Colour[card.subtype ?? "Orange"]);

		// TODO: amend typeline when we get the real string or array and localize
		let description =
			`**Type**: ${RaceIcon[card.race]} ${card.race} | ${card.typeline}\n` +
			`**Attribute**: ${AttributeIcon[card.attribute]} ${card.attribute}\n`;

		if (card.subtype === "Xyz") {
			description += `**Rank**: ${Icon.Rank} ${card.rank} **ATK**: ${card.atk} **DEF**: ${card.def}`;
		} else if (card.subtype === "Link") {
			const arrows = card.arrows.join("");
			description += `**Link Rating**: ${card.link} **ATK**: ${card.atk} **Link Arrows**: ${arrows}`;
		} else {
			description += `**Level**: ${Icon.Level} ${card.level} **ATK**: ${card.atk} **DEF**: ${card.def}`;
		}

		if (card.scale !== undefined) {
			description += ` **Pendulum Scale**: ${Icon.LeftScale}${card.scale}/${card.scale}${Icon.RightScale}`;
		}

		embed.setDescription(description);

		if (card.scale === undefined) {
			embed.addField("Card Text", card[lang]?.description || card.en.description);

			// common return
		} else {
			// Discord cannot take just a blank or spaces, but this zero-width space works
			embed.addField("Pendulum Effect", card[lang]?.pendulum || card.en.pendulum || "\u200b");

			const addon = new MessageEmbed()
				.setColor(Colour.Spell)
				.addField("Card Text", card[lang]?.description || card.en.description)
				// one or both may be null to due data corruption or prereleases
				.setFooter({ text: `Password: ${card.password} | Konami ID #${card.kid}` });

			return [embed, addon];
		}
	} else {
		embed.setColor(Colour[card.type]);

		let description = Icon[card.type];
		const subtype = card.subtype;
		if (subtype !== "Normal" && subtype in Icon) {
			description += ` ${Icon[subtype]}`;
		}
		description += `**${card.subtype} ${card.type}**`;
		embed.setDescription(description);

		embed.addField("Card Effect", card[lang]?.description || card.en.description);
	}

	// one or both may be null to due data corruption or prereleases
	embed.setFooter({ text: `Password: ${card.password} | Konami ID #${card.kid}` });

	return [embed];
}

export function inferInputType(
	type: "password" | "kid" | "name" | undefined,
	input: string
): ["password" | "kid" | "name", string] {
	if (type) {
		return [type, input];
	}
	// handle edge case for specific bad input
	if (parseInt(input).toString() === input && input !== "NaN") {
		// if its all digits, treat as password.
		return ["password", input];
	} else if (input.startsWith("#")) {
		// initial # indicates KID, as long as the rest is digits
		const kid = input.slice(1);
		if (parseInt(kid).toString() === kid && kid !== "NaN") {
			return ["kid", kid];
		} else {
			return ["name", input];
		}
	} else {
		return ["name", input];
	}
}
