import { Static } from "@sinclair/typebox";
import { EmbedBuilder } from "discord.js";
import { Got } from "got";
import { c, t, useLocale } from "ttag";
import {
	AttributeIcon,
	Colour,
	Icon,
	RaceIcon,
	formatCardText,
	parseAndExpandRuby,
	yugipediaFileRedirect
} from "./card";
import { RushCardSchema } from "./definitions/rush";
import { UpdatingLimitRegulationVector } from "./limit-regulation";
import { Locale } from "./locale";

const rc = c;

export function videoGameIllustration(card: Static<typeof RushCardSchema>): string {
	// Filter card name down to alphanumeric characters
	const probableBasename = (card.name.en ?? "").replaceAll(/\W/g, "");
	// https://yugipedia.com/wiki/Category:Yu-Gi-Oh!_RUSH_DUEL:_Saikyo_Battle_Royale!!_Let%27s_Go!_Go_Rush!!_card_artworks
	return `${probableBasename}-G002-JP-VG-artwork.png`;
}

export function videoGameIllustrationURL(card: Static<typeof RushCardSchema>): string {
	return yugipediaFileRedirect(videoGameIllustration(card));
}

export function createRushCardEmbed(
	card: Static<typeof RushCardSchema>,
	lang: Locale,
	limitRegulation: UpdatingLimitRegulationVector,
	excludeIcons = false
): EmbedBuilder {
	useLocale(lang);

	const yugipedia = card.konami_id
		? `https://yugipedia.com/wiki/${card.konami_id}?utm_source=bastion`
		: `https://yugipedia.com/wiki/?curid=${card.yugipedia_page_id}&utm_source=bastion`;
	const rushcard = `https://rushcard.io/card/?search=${card.yugipedia_page_id}&utm_source=bastion`;
	// Official database, does not work for zh locales
	const official = `https://www.db.yugioh-card.com/rushdb/card_search.action?ope=2&request_locale=${lang}&cid=${card.konami_id}`;
	const rulings = `https://www.db.yugioh-card.com/rushdb/faq_search.action?ope=4&request_locale=ja&cid=${card.konami_id}`;

	const links = {
		name: t`🔗 Links`,
		value: t`[Official Konami DB](${official}) | [Rulings (Japanese)](${rulings}) | [Yugipedia](${yugipedia}) | [RushCard](${rushcard})`
	};
	if (card.konami_id === null) {
		links.value = t`[Yugipedia](${yugipedia}) | [RushCard](${rushcard})`;
	}

	const embed = new EmbedBuilder().setURL(rushcard).setThumbnail(videoGameIllustrationURL(card));
	let description = "";

	const name = card.name[lang];
	if ((lang === "ja" || lang === "ko") && name?.includes("<ruby>")) {
		const [rubyless, rubyonly] = parseAndExpandRuby(name);
		description += `-# ${rubyonly}\n**[${rubyless}](${rushcard})**\n\n`;
	} else {
		embed.setTitle(name || `${card.name.en}`);
	}

	if (lang === "ja" && card.name.ja_romaji) {
		description = `**Rōmaji**: ${card.name.ja_romaji}\n`;
	}

	if (card.legend) {
		description += t`__**LEGEND**__`;
		description += "\n";
	} else if (card.konami_id) {
		const limitRegulationDisplay = limitRegulation.get(card.konami_id) ?? 3;
		description += t`**Limit**: ${limitRegulationDisplay}`;
		description += "\n";
	}

	if (card.card_type === "Monster") {
		embed.setColor(
			Colour[
				(() => {
					if (card.monster_type_line.includes("Normal")) {
						return "Normal";
					}
					if (card.monster_type_line.includes("Fusion")) {
						return "Fusion";
					}
					return "Orange";
				})()
			]
		);

		const race = card.monster_type_line.split(" /")[0];
		const raceIcon = excludeIcons ? "" : RaceIcon[race] || "";
		const localizedMonsterTypeLine = card.monster_type_line
			.split(" / ")
			.map(s => rc("monster-type-race").gettext(s))
			.join(" / ");
		const attributeIcon = excludeIcons ? "" : AttributeIcon[card.attribute];
		const localizedAttribute = rc("attribute").gettext(card.attribute);
		const levelIcon = excludeIcons ? "" : Icon.Level;
		description += t`**Type**: ${raceIcon} ${localizedMonsterTypeLine}`;
		description += "\n";
		description += t`**Attribute**: ${attributeIcon} ${localizedAttribute}`;
		description += "\n";
		description += t`**Level**: ${levelIcon} ${card.level} **ATK**: ${card.atk} **DEF**: ${card.def}`;
		if ("maximum_atk" in card) {
			description += "\n";
			description += t`**MAXIMUM ATK**: ${card.maximum_atk}`;
		}
		if ("summoning_condition" in card && card.summoning_condition) {
			description += "\n\n";
			description += formatCardText(card.summoning_condition, lang);
		}
		if ("materials" in card) {
			description += "\n\n";
			description += formatCardText(card.materials, lang);
		}
		if (card.monster_type_line.includes("Fusion") && "text" in card) {
			description += "\n\n";
			// This is effectively the localised materials line for non-Effect Fusion monsters
			description += formatCardText(card.text, lang);
		}

		embed.setDescription(description);

		if ("requirement" in card) {
			embed.addFields({ name: c("card-embed").t`[REQUIREMENT]`, value: formatCardText(card.requirement, lang) });
			let name = c("card-embed").t`[EFFECT]`;
			if (card.effect_types?.includes("Continuous")) {
				name = c("card-embed").t`[CONTINUOUS EFFECT]`;
			} else if (card.effect_types?.includes("Multi-Choice")) {
				name = c("card-embed").t`[MULTI-CHOICE EFFECT]`;
			}
			embed.addFields({ name, value: formatCardText(card.effect, lang) });
		} else if ("text" in card && !card.monster_type_line.includes("Fusion")) {
			embed.addFields({ name: c("card-embed").t`Card Text`, value: formatCardText(card.text, lang) });
		}
	} else {
		// Spells and Traps
		embed.setColor(Colour[card.card_type]);

		description += "\n"; // don't put \n in a gettext string
		const cardTypeIcon = excludeIcons ? "" : Icon[card.card_type];
		const localizedProperty = rc("spell-trap-property").gettext(`${card.property} ${card.card_type}`);
		const propertyIcon = excludeIcons ? "" : Icon[card.property];
		embed.setDescription(`${description}${cardTypeIcon} ${localizedProperty} ${propertyIcon}`);

		embed.addFields(
			{ name: c("card-embed").t`[REQUIREMENT]`, value: formatCardText(card.requirement, lang) },
			{ name: c("card-embed").t`[EFFECT]`, value: formatCardText(card.effect, lang) }
		);
	}

	embed.addFields(links);

	const footer = card.konami_id ? t`Konami ID #${card.konami_id}` : t`Not yet released`;
	embed.setFooter({ text: footer });

	return embed;
}

export async function searchRushCard(
	got: Got,
	query: string,
	lang: Locale,
	count: number = 1
): Promise<Static<typeof RushCardSchema>[]> {
	const url = new URL(`${process.env.API_URL}/rush/search`);
	url.searchParams.set("name", query);
	url.searchParams.set("lang", lang);
	url.searchParams.set("count", `${count}`);
	return await got(url, { throwHttpErrors: true }).json<Static<typeof RushCardSchema>[]>();
}

export async function getRushCardByKonamiId(
	got: Got,
	konamiId: string | number
): Promise<Static<typeof RushCardSchema> | undefined> {
	const response = await got(`${process.env.API_URL}/rush/${konamiId}`);
	switch (response.statusCode) {
		case 200:
			return JSON.parse(response.body);
		case 404:
			return undefined;
		default:
			throw new got.HTTPError(response);
	}
}

// Only used by /rush-duel
export function suggestSearchTrigger(input: string, korean: boolean): string {
	if (korean) {
		if (input.charCodeAt(0) % 2 === 0) {
			return `러<${input}>`;
		} else {
			return `<${input}>러`;
		}
	} else {
		switch (input.charCodeAt(0) % 4) {
			case 0:
				return `r<${input}>`;
			case 1:
				return `<${input}>r`;
			case 2:
				return `R<${input}>`;
			case 3:
			default:
				return `<${input}>R`;
		}
	}
}

// Only used by /rush-duel
export function addTip(embed: EmbedBuilder, searchTrigger: string): EmbedBuilder {
	const tip = t`Using ${searchTrigger}, you can search for Rush Duel cards directly in messages without autocomplete`;
	return embed.setFooter({ text: `${embed.data.footer?.text}\n${tip}` });
}
