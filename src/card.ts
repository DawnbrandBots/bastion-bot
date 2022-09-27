import { Static } from "@sinclair/typebox";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { parseDocument } from "htmlparser2";
import fetch from "node-fetch";
import { c, t, useLocale } from "ttag";
import { CardSchema, LimitRegulation } from "./definitions/yaml-yugi";
import { Locale } from "./locale";

/**
 * There's some neat hacks in this file to achieve dynamic localization at
 * runtime while continuing to use the static gettext localization system that
 * ttag provides.
 *
 * First, write out and annotate all the terms that we would possibly need to
 * use at runtime, for ttag-cli to collect for translators. This can pull double
 * duty (RaceIcon, AttributeIcon), since at import time, the locale is default.
 *
 * Then, at runtime, use the following reassigned import instead to hide the
 * dynamic calls from ttag-cli and prevent it from complaining and breaking.
 */
const rc = c;

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

c("monster-type-race").t`Normal`;
c("monster-type-race").t`Effect`;
c("monster-type-race").t`Pendulum`;
c("monster-type-race").t`Ritual`;
c("monster-type-race").t`Fusion`;
c("monster-type-race").t`Synchro`;
c("monster-type-race").t`Xyz`;
c("monster-type-race").t`Link`;
c("monster-type-race").t`Tuner`;
c("monster-type-race").t`Flip`;
c("monster-type-race").t`Toon`;
c("monster-type-race").t`Spirit`;
c("monster-type-race").t`Union`;
c("monster-type-race").t`Gemini`;
c("spell-trap-property").t`Normal Spell`;
c("spell-trap-property").t`Continuous Spell`;
c("spell-trap-property").t`Equip Spell`;
c("spell-trap-property").t`Quick-Play Spell`;
c("spell-trap-property").t`Field Spell`;
c("spell-trap-property").t`Ritual Spell`;
c("spell-trap-property").t`Normal Trap`;
c("spell-trap-property").t`Continuous Trap`;
c("spell-trap-property").t`Counter Trap`;

// Guarantee default locale at import time since the resulting strings matter.
useLocale("en");

const RaceIcon = {
	[c("monster-type-race").t`Warrior`]: "<:Warrior:602707927224025118>",
	[c("monster-type-race").t`Spellcaster`]: "<:Spellcaster:602707926834085888>",
	[c("monster-type-race").t`Fairy`]: "<:Fairy:602707926200614912>",
	[c("monster-type-race").t`Fiend`]: "<:Fiend:602707926850732035>",
	[c("monster-type-race").t`Zombie`]: "<:Zombie:602707927102390292>",
	[c("monster-type-race").t`Machine`]: "<:Machine:602707926733291521>",
	[c("monster-type-race").t`Aqua`]: "<:Aqua:602707887931785238>",
	[c("monster-type-race").t`Pyro`]: "<:Pyro:602707925793767427>",
	[c("monster-type-race").t`Rock`]: "<:Rock:602707926213460010>",
	[c("monster-type-race").t`Winged Beast`]: "<:WingedBeast:602707926464987138>",
	[c("monster-type-race").t`Plant`]: "<:Plant:602707792138076186>",
	[c("monster-type-race").t`Insect`]: "<:Insect:602707926146088960>",
	[c("monster-type-race").t`Thunder`]: "<:Thunder:602707927484203013>",
	[c("monster-type-race").t`Dragon`]: "<:Dragon:602707926901325834>",
	[c("monster-type-race").t`Beast`]: "<:Beast:602707889018372109>",
	[c("monster-type-race").t`Beast-Warrior`]: "<:BeastWarrior:602707890171543593>",
	[c("monster-type-race").t`Dinosaur`]: "<:Dinosaur:602713887141527563>",
	[c("monster-type-race").t`Fish`]: "<:Fish:602707925877915659>",
	[c("monster-type-race").t`Sea Serpent`]: "<:SeaSerpent:602707926288826378>",
	[c("monster-type-race").t`Reptile`]: "<:Reptile:602707927219830784>",
	[c("monster-type-race").t`Psychic`]: "<:Psychic:602707926767108129>",
	[c("monster-type-race").t`Divine-Beast`]: "<:DivineBeast:602707925730852874>",
	[c("monster-type-race").t`Creator God`]: "<:CreatorGod:602707927219961866>",
	[c("monster-type-race").t`Wyrm`]: "<:Wyrm:602707927068835884>",
	[c("monster-type-race").t`Cyberse`]: "<:Cyberse:602707927421157376>"
	//Yokai: "<:Yokai:602707927932993546>",
	//Charisma: "<:Charisma:602707891530629130>"
};

const AttributeIcon = {
	[c("attribute").t`EARTH`]: "<:EARTH:602707925726658570>",
	[c("attribute").t`WATER`]: "<:WATER:602707927341596691>",
	[c("attribute").t`FIRE`]: "<:FIRE:602707928255954963>",
	[c("attribute").t`WIND`]: "<:WIND:602707926771171348>",
	[c("attribute").t`LIGHT`]: "<:LIGHT:602707926183968768>",
	[c("attribute").t`DARK`]: "<:DARK:602707926792273920>",
	[c("attribute").t`DIVINE`]: "<:DIVINE:602707926594879498>"
	//LAUGH: "<:LAUGH:602719132567207938>"
};

const Icon = {
	Spell: "<:SPELL:623021653580054538>",
	Trap: "<:TRAP:623021653810741258> ",
	// Property icons of Spells/Traps
	Normal: "", // Only appears in some video games, not on physical cards
	Ritual: "<:Ritual:602707927274487838>",
	"Quick-Play": "<:QuickPlay:602707927073030150> ",
	Continuous: "<:Continuous:602707892507770891>",
	Equip: "<:Equip:602707925886042119> ",
	Field: "<:FIELD:602707926834216963> ",
	Counter: "<:Counter:602707928075599872>",
	//Link: "<:LinkSpell:602707598164099104>",
	// Monster values
	LeftScale: "<:ScaleLeft:602710168337121290>",
	RightScale: "<:ScaleRight:602710170430210048>",
	Level: "<:level:602707925949087760>",
	Rank: "<:rank:602707927114973185>"
};

// TODO: remove "kid"
export type CardLookupType = "name" | "password" | "konami-id" | "kid";

export async function getCard(
	type: CardLookupType,
	input: string,
	lang?: Locale
): Promise<Static<typeof CardSchema> | undefined> {
	let url = `${process.env.SEARCH_API}/yaml-yugi`; // treated as string instead of string? without forbidden non-null check
	input = encodeURIComponent(input);
	if (type === "password") {
		url += `/card/password/${input}`;
	} else if (type === "konami-id" || type === "kid") {
		url += `/card/kid/${input}`;
	} else {
		url += `/search?name=${input}`;
		if (lang) {
			url += `&lang=${lang}`;
		}
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

function formatLimitRegulation(value: LimitRegulation | null | undefined): number | null {
	switch (value) {
		case "Forbidden":
			return 0;
		case "Limited":
			return 1;
		case "Semi-Limited":
			return 2;
		case "Unlimited":
			return 3;
		default:
			return null;
	}
}

export function parseAndExpandRuby(html: string): [string, string] {
	let rubyless = "";
	let rubyonly = "";
	const doc = parseDocument(html);
	for (const element of doc.children) {
		if (element.type === "text") {
			rubyless += element.data;
			rubyonly += element.data;
		} else if (element.type === "tag" && element.name === "ruby") {
			if (element.children.length === 2) {
				const [rb, rt] = element.children;
				if (
					rb.type === "text" &&
					rt.type === "tag" &&
					rt.name === "rt" &&
					rt.children.length === 1 &&
					rt.children[0].type === "text"
				) {
					rubyless += rb.data;
					rubyonly += rt.children[0].data;
				}
			}
		}
	}
	return [rubyless, rubyonly];
}

function formatCardName(card: Static<typeof CardSchema>, lang: Locale): string {
	const name = card.name[lang]; // TypeScript cannot narrow typing on this without the variable
	if ((lang === "ja" || lang === "ko") && name?.includes("<ruby>")) {
		const [rubyless, rubyonly] = parseAndExpandRuby(name);
		return `${rubyless}（${rubyonly}）`;
	}
	return name || `${card.name.en}`;
}

function formatOCGNumbering(text: string): string {
	// Insert newlines before Unicode circled numbers followed by colon if missing
	return text.replaceAll(/([^\n])([\u{2460}-\u{2473}][:：])/gu, "$1\n$2").trimStart();
	// Generic test case:
	// - PSY-Framegear Gamma
	// Test case for numbering as the first character:
	// - Assault Blackwing - Kunai the Drizzle
	// Test cases with HOPT conditions:
	// - Windwitch - Crystal Bell
	// Test cases for numbering immediately after the materials line:
	// - D/D/D Wave Oblivion King Caesar Ragnarok
	// - Number 86
}

function formatCardText(text: Static<typeof CardSchema>["text"], lang: Locale): string {
	// Discord cannot take just a blank or spaces, but this zero-width space works
	if (lang === "ja" || lang === "ko" || lang === "zh-CN" || lang === "zh-TW") {
		let str = text[lang]; // TypeScript cannot narrow typing on this without the variable
		if (str) {
			if (str.includes("<ruby>")) {
				str = parseAndExpandRuby(str)[0]; // strip for main text
			}
			return formatOCGNumbering(str);
		}
		return text.en || "\u200b";
	}
	return text[lang] || text.en || "\u200b";
}

export function createCardEmbed(card: Static<typeof CardSchema>, lang: Locale): EmbedBuilder[] {
	useLocale(lang);

	const yugipediaPage = card.konami_id ?? encodeURIComponent(`${card.name.en}`);
	const yugipedia = `https://yugipedia.com/wiki/${yugipediaPage}?utm_source=bastion`;
	const ygoprodeckTerm = card.password ?? encodeURIComponent(`${card.name.en}`);
	const ygoprodeck = `https://db.ygoprodeck.com/card/?search=${ygoprodeckTerm}&utm_source=bastion`;
	// Official database, does not work for zh locales
	const official = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&request_locale=${lang}&cid=${card.konami_id}`;
	const rulings = `https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&request_locale=ja&cid=${card.konami_id}`;

	const embed = new EmbedBuilder()
		.setTitle(formatCardName(card, lang))
		.setURL(ygoprodeck)
		.setThumbnail(`${process.env.IMAGE_HOST}/${card.password}.png`);

	const links = {
		name: t`:link: Links`,
		value: t`[Official Konami DB](${official}) | [OCG Rulings](${rulings}) | [Yugipedia](${yugipedia}) | [YGOPRODECK](${ygoprodeck})`
	};
	if (card.konami_id === null) {
		links.value = t`[Yugipedia](${yugipedia}) | [YGOPRODECK](${ygoprodeck})`;
	}

	let description = "";
	if (lang === "ja") {
		if (card.name.ja_romaji) {
			description = `**Rōmaji**: ${card.name.ja_romaji}\n`;
		}
	} else if (lang === "ko") {
		if (card.name.ko_rr) {
			description = `**RR**: ${card.name.ko_rr}\n`;
		}
	}

	const limitRegulations = [
		{ label: "TCG: ", value: formatLimitRegulation(card.limit_regulation.tcg) },
		{ label: "OCG: ", value: formatLimitRegulation(card.limit_regulation.ocg) },
		{ label: "Speed: ", value: formatLimitRegulation(card.limit_regulation.speed) }
	];
	let limitRegulationDisplay: string;
	if (["ja", "ko", "zh-CN", "zh-TW"].includes(lang)) {
		// Switch order and exclude TCG Speed
		limitRegulationDisplay = [limitRegulations[1], limitRegulations[0]]
			.filter(({ value }) => value !== null)
			.map(({ label, value }) => `${label}${value}`)
			.join(" / ");
	} else {
		limitRegulationDisplay = limitRegulations
			.filter(({ value }) => value !== null)
			.map(({ label, value }) => `${label}${value}`)
			.join(" / ");
	}
	if (limitRegulationDisplay) {
		// Forbidden/Limited Lists or Limit Regulations in the OCG
		description += t`**Limit**: ${limitRegulationDisplay}`;
		description += "\n";
	}

	// TODO: expand with hyperlinks
	if (card.card_type === "Monster") {
		embed.setColor(
			Colour[
				(() => {
					const types = ["Normal", "Ritual", "Fusion", "Synchro", "Xyz", "Link"] as const;
					for (const type of types) {
						if (card.monster_type_line.includes(type)) {
							return type;
						}
					}
					return "Orange";
				})()
			]
		);

		const race = card.monster_type_line.split(" /")[0];
		const localizedMonsterTypeLine = card.monster_type_line
			.split(" / ")
			.map(s => rc("monster-type-race").gettext(s))
			.join(" / ");
		const localizedAttribute = rc("attribute").gettext(card.attribute);
		description += t`**Type**: ${RaceIcon[race]} ${localizedMonsterTypeLine}`;
		description += "\n";
		description += t`**Attribute**: ${AttributeIcon[card.attribute]} ${localizedAttribute}`;
		description += "\n";

		if ("rank" in card) {
			description += t`**Rank**: ${Icon.Rank} ${card.rank} **ATK**: ${card.atk} **DEF**: ${card.def}`;
		} else if ("link_arrows" in card) {
			const arrows = card.link_arrows.join("");
			description += t`**Link Rating**: ${card.link_arrows.length} **ATK**: ${card.atk} **Link Arrows**: ${arrows}`;
		} else {
			description += t`**Level**: ${Icon.Level} ${card.level} **ATK**: ${card.atk} **DEF**: ${card.def}`;
		}

		if (card.pendulum_scale !== undefined) {
			// https://github.com/ttag-org/ttag/issues/249
			const formattedScale = `${Icon.LeftScale}${card.pendulum_scale}/${card.pendulum_scale}${Icon.RightScale}`;
			description += " ";
			description += t`**Pendulum Scale**: ${formattedScale}`;
		}

		embed.setDescription(description);

		if (card.pendulum_effect === undefined) {
			embed.addFields({ name: c("card-embed").t`Card Text`, value: formatCardText(card.text, lang) });

			// return path shared with Spells and Traps
		} else {
			embed.addFields({
				name: c("card-embed").t`Pendulum Effect`,
				value: formatCardText(card.pendulum_effect, lang)
			});

			const addon = new EmbedBuilder()
				.setColor(Colour.Spell)
				.addFields({ name: c("card-embed").t`Card Text`, value: formatCardText(card.text, lang) })
				.addFields(links)
				// one or both may be null to due data corruption or prereleases
				.setFooter({ text: t`Password: ${card.password} | Konami ID #${card.konami_id}` });

			// exclusive Pendulum return path
			return [embed, addon];
		}
	} else {
		// Spells and Traps
		embed.setColor(Colour[card.card_type]);

		description += "\n"; // don't put \n in a gettext string
		const localizedProperty = rc("spell-trap-property").gettext(`${card.property} ${card.card_type}`);
		embed.setDescription(`${description}${Icon[card.card_type]} ${localizedProperty} ${Icon[card.property]}`);

		embed.addFields({ name: c("card-embed").t`Card Effect`, value: formatCardText(card.text, lang) });
	}

	embed.addFields(links);
	// one or both may be null to due data corruption or prereleases
	embed.setFooter({ text: t`Password: ${card.password} | Konami ID #${card.konami_id}` });

	return [embed];
}

type InputType = "password" | "kid" | "name";

export function inferInputType(interaction: ChatInputCommandInteraction): [InputType, string] {
	const type = interaction.options.getString("type", false);
	const input = interaction.options.getString("input", true);
	if (type) {
		return [type as InputType, input];
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
