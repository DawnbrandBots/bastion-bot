import { Static } from "@sinclair/typebox";
import {
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandIntegerOption,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder
} from "discord.js";
import { Got } from "got";
import { LRUMap } from "mnemonist";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { AttributeIcon, Colour, formatCardName, formatCardText, Icon, RaceIcon } from "../card";
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
import { addNotice, replyLatency, serialiseInteraction } from "../utils";

const rc = c;

export function createRushCardEmbed(card: Static<typeof RushCardSchema>, lang: Locale): EmbedBuilder {
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

	const embed = new EmbedBuilder().setTitle(formatCardName(card, lang)).setURL(rushcard);

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
		// TODO: switch to race approach since that's how it's printed for Rush Duel
		const localizedProperty = rc("spell-trap-property").gettext(`${card.property} ${card.card_type}`);
		embed.setDescription(`${description}${Icon[card.card_type]} ${localizedProperty} ${Icon[card.property]}`);

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

@injectable()
export class RushDuelCommand extends AutocompletableCommand {
	#logger = getLogger("command:rush");
	// Covers well beyond the total number of Rush Duel cards (in one language)
	private suggestionCache = new LRUMap<string, Static<typeof RushCardSchema>>(2000);

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
			new SlashCommandIntegerOption().setRequired(true),
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
		konamiIdSubcommand.addIntegerOption(konamiIdOption).addStringOption(getResultLangStringOption());
		randomSubcommand.addStringOption(getResultLangStringOption());
		builder.addSubcommand(searchSubcommand).addSubcommand(konamiIdSubcommand).addSubcommand(randomSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private async search(query: string, lang: Locale, count: number): Promise<Static<typeof RushCardSchema>[]> {
		const url = new URL(`${process.env.API_URL}/rush/search`);
		url.searchParams.set("name", query);
		url.searchParams.set("lang", lang);
		url.searchParams.set("count", `${count}`);
		return await this.got(url, {
			headers: { Accept: "application/json" },
			throwHttpErrors: true
		}).json<Static<typeof RushCardSchema>[]>();
	}

	override async autocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
		const query = interaction.options.getFocused();
		if (!query) {
			await interaction.respond([]);
			return;
		}
		try {
			const resultLanguage = await this.locales.get(interaction);
			const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
			const start = Date.now();
			const response = await this.search(query, inputLanguage, 25);
			const latency = Date.now() - start;
			this.#logger.info(serialiseInteraction(interaction, { autocomplete: query, latency }));
			const options = [];
			for (const card of response) {
				const name = formatCardName(card, inputLanguage);
				this.suggestionCache.set(name, card);
				options.push({ name, value: name });
			}
			await interaction.respond(options);
			this.metrics.writeCommand(interaction, latency);
		} catch (error) {
			this.#logger.warn(serialiseInteraction(interaction, { autocomplete: query }), error);
			this.metrics.writeCommand(interaction, -1);
		}
	}

	protected override async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const subcommand = interaction.options.getSubcommand(true);
		switch (subcommand) {
			case "search":
				return await this.subcommandSearch(interaction);
			case "konami-id":
				return await this.subcommandKonamiId(interaction);
			case "random":
				return await this.subcommandRandom(interaction);
			default:
				throw new Error(`Unknown rush-duel subcommand: ${subcommand}`);
		}
	}

	private async subcommandSearch(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const input = interaction.options.getString("input", true);
		const resultLanguage = await this.locales.get(interaction);
		const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
		let card = this.suggestionCache.get(input);
		if (card) {
			this.#logger.info(serialiseInteraction(interaction, { input, cached: card.yugipedia_page_id }));
		} else {
			const start = Date.now();
			const response = await this.search(input, inputLanguage, 1);
			const latency = Date.now() - start;
			if (!response.length) {
				this.#logger.info(serialiseInteraction(interaction, { input, latency, response: null }));
				useLocale(resultLanguage);
				const reply = await interaction.reply({
					content: t`Could not find a card matching \`${input}\`!`,
					fetchReply: true
				});
				return replyLatency(reply, interaction);
			}
			card = response[0];
			this.#logger.info(serialiseInteraction(interaction, { input, latency, response: card.yugipedia_page_id }));
		}
		const embed = createRushCardEmbed(card, resultLanguage);
		const reply = await interaction.reply({ embeds: addNotice(embed), fetchReply: true });
		return replyLatency(reply, interaction);
	}

	private async subcommandKonamiId(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const input = interaction.options.getInteger("input", true);
		this.#logger.info(serialiseInteraction(interaction, { input }));
		const response = await this.got(`${process.env.API_URL}/rush/${input}`, {
			headers: { Accept: "application/json" }
		});
		const lang = await this.locales.get(interaction);
		switch (response.statusCode) {
			case 404: {
				useLocale(lang);
				const reply = await interaction.reply({
					content: t`Could not find a card matching \`${input}\`!`,
					fetchReply: true
				});
				return replyLatency(reply, interaction);
			}
			case 200: {
				const card = JSON.parse(response.body);
				const embed = createRushCardEmbed(card, lang);
				const reply = await interaction.reply({
					embeds: addNotice(embed),
					fetchReply: true
				});
				return replyLatency(reply, interaction);
			}
			default:
				throw new this.got.HTTPError(response);
		}
	}

	private async subcommandRandom(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const [card] = await this.got(`${process.env.API_URL}/rush/random`, {
			headers: { Accept: "application/json" },
			throwHttpErrors: true
		}).json<Static<typeof RushCardSchema>[]>();
		this.#logger.info(serialiseInteraction(interaction, { response: card.yugipedia_page_id }));
		const lang = await this.locales.get(interaction);
		const embed = createRushCardEmbed(card, lang);
		const reply = await interaction.reply({ embeds: addNotice(embed), fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
