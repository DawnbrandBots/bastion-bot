import { Static } from "@sinclair/typebox";
import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder
} from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { AttributeIcon, Colour, formatCardName, Icon, RaceIcon } from "../card";
import { AutocompletableCommand } from "../Command";
import { RushCardSchema } from "../definitions/rush";
import {
	buildLocalisedCommand,
	getInputLangStringOption,
	getResultLangStringOption,
	Locale,
	LocaleProvider
} from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

const rc = c;

export function createRushCardEmbed(card: Static<typeof RushCardSchema>, lang: Locale): EmbedBuilder {
	useLocale(lang);

	const yugipedia = card.konami_id
		? `https://yugipedia.com/wiki/${card.konami_id}?utm_source=bastion`
		: `https://yugipedia.com/wiki/?curid=${card.yugipedia_page_id}&utm_source=bastion`;
	const rushcard = `https://rushcard.io/card/?search=${card.yugipedia_page_id}`;
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
	if (card.legend) {
		description += t`__**LEGEND**__`;
		description += "\n";
	}

	const embed = new EmbedBuilder().setTitle(formatCardName(card as any, lang)).setURL(rushcard);

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
		// TODO: is approach scalable with custom Rush Fusion races?
		const localizedMonsterTypeLine = card.monster_type_line
			.split(" / ")
			.map(s => rc("monster-type-race").gettext(s))
			.join(" / ");
		const localizedAttribute = rc("attribute").gettext(card.attribute);
		description += t`**Type**: ${RaceIcon[race]} ${localizedMonsterTypeLine}`;
		description += "\n";
		description += t`**Attribute**: ${AttributeIcon[card.attribute]} ${localizedAttribute}`;
		description += "\n";
		description += t`**Level**: ${Icon.Level} ${card.level} **ATK**: ${card.atk} **DEF**: ${card.def}`;
		if ("maximum_atk" in card) {
			description += "\n";
			description += t`**MAXIMUM ATK**: ${card.maximum_atk}`;
		}
		if ("summoning_condition" in card && card.summoning_condition) {
			description += "\n\n";
			description += card.summoning_condition[lang];
		}
		if ("materials" in card) {
			description += "\n\n";
			description += card.materials[lang];
		}

		embed.setDescription(description);

		if ("requirement" in card) {
			embed.addFields({ name: c("card-embed").t`[REQUIREMENT]`, value: card.requirement[lang] || "\u200b" });
			let name = c("card-embed").t`[EFFECT]`;
			if (card.effect_types?.includes("Continuous")) {
				name = c("card-embed").t`[CONTINUOUS EFFECT]`;
			} else if (card.effect_types?.includes("Multi-Choice")) {
				name = c("card-embed").t`[MULTI-CHOICE EFFECT]`;
			}
			embed.addFields({ name, value: card.effect[lang] || "\u200b" });
		} else if ("text" in card) {
			embed.addFields({ name: c("card-embed").t`Card Text`, value: card.text[lang] || "\u200b" });
		}
	} else {
		// Spells and Traps
		embed.setColor(Colour[card.card_type]);

		description += "\n"; // don't put \n in a gettext string
		// TODO: switch to race approach since that's how it's printed for Rush Duel
		const localizedProperty = rc("spell-trap-property").gettext(`${card.property} ${card.card_type}`);
		embed.setDescription(`${description}${Icon[card.card_type]} ${localizedProperty} ${Icon[card.property]}`);

		embed.addFields(
			{ name: c("card-embed").t`[REQUIREMENT]`, value: card.requirement[lang] || "\u200b" },
			{ name: c("card-embed").t`[EFFECT]`, value: card.effect[lang] || "\u200b" }
		);
	}

	embed.addFields(links);

	const footer = card.konami_id ? t`Konami ID #${card.konami_id}` : t`Not yet released`;
	embed.setFooter({ text: footer });

	return embed;
}

@injectable()
export class RushDuelCommand extends AutocompletableCommand {
	#logger = getLogger("command:rush");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`rush-duel`,
			() => c("command-description").t`Find information on Rush Duel cards.`
		);
		const searchSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`search`,
			() => c("command-option-description").t`Find all information for the Rush Duel card with this name.`
		);
		const nameOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true).setAutocomplete(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Card name, fuzzy matching supported.`
		);
		const konamiIdSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`konami-id`,
			() =>
				c("command-option-description")
					.t`Find all information for the Rush Duel card with this official database ID.`
		);
		const konamiIdOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Konami's official card database identifier.`
		);
		const randomSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`random`,
			() => c("command-option-description").t`Get a random Rush Duel card.`
		);
		searchSubcommand
			.addStringOption(nameOption)
			.addStringOption(getInputLangStringOption())
			.addStringOption(getResultLangStringOption());
		konamiIdSubcommand.addStringOption(konamiIdOption).addStringOption(getResultLangStringOption());
		randomSubcommand.addStringOption(getResultLangStringOption());
		builder.addSubcommand(searchSubcommand).addSubcommand(konamiIdSubcommand).addSubcommand(randomSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	override autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
		throw new Error("Method not implemented.");
	}

	protected override execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const subcommand = interaction.options.getSubcommand(true);
		switch (subcommand) {
			case "search":
				return this.subcommandSearch(interaction);
			case "konami-id":
				return this.subcommandKonamiId(interaction);
			case "random":
				return this.subcommandRandom(interaction);
			default:
				throw new Error(`Unknown rush-duel subcommand: ${subcommand}`);
		}
	}

	private async subcommandSearch(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const input = interaction.options.getString("input", true);
		const resultLanguage = await this.locales.get(interaction);
		const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
		return -1;
	}

	private async subcommandKonamiId(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const input = interaction.options.getString("input", true);
		// Send out both requests simultaneously
		const [, card] = await Promise.all([
			interaction.deferReply(),
			this.got(`${process.env.API_URL}/rush/${input}`, {
				headers: { Accept: "application/json" },
				throwHttpErrors: true
			}).json<Static<typeof RushCardSchema>>()
		]);
		const lang = await this.locales.get(interaction);
		const embed = createRushCardEmbed(card, lang);
		const end = Date.now();
		await interaction.editReply({ embeds: [embed] }); // Actually returns void
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}

	private async subcommandRandom(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		// Send out both requests simultaneously
		const [, response] = await Promise.all([
			interaction.deferReply(),
			this.got(`${process.env.API_URL}/rush/random`, {
				headers: { Accept: "application/json" },
				throwHttpErrors: true
			}).json<Static<typeof RushCardSchema>[]>()
		]);
		const lang = await this.locales.get(interaction);
		const embed = createRushCardEmbed(response[0], lang);
		const end = Date.now();
		await interaction.editReply({ embeds: [embed] }); // Actually returns void
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
