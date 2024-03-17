import { Static } from "@sinclair/typebox";
import {
	AutocompleteInteraction,
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
import { AutocompletableCommand } from "../Command";
import { ArtSwitcher, checkYugipediaRedirect } from "../art";
import { AttributeIcon, Colour, Icon, RaceIcon, formatCardName, formatCardText, getRubylessCardName } from "../card";
import { RushCardSchema } from "../definitions/rush";
import { UpdatingLimitRegulationVector } from "../limit-regulation";
import {
	Locale,
	LocaleProvider,
	buildLocalisedCommand,
	getInputLangStringOption,
	getResultLangStringOption
} from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { addNotice, replyLatency, serialiseInteraction } from "../utils";

const rc = c;

function videoGameIllustrationURL(card: Static<typeof RushCardSchema>): string {
	// Filter card name down to alphanumeric characters
	const probableBasename = (card.name.en ?? "").replaceAll(/\W/g, "");
	// https://yugipedia.com/wiki/Category:Yu-Gi-Oh!_RUSH_DUEL:_Saikyo_Battle_Royale!!_Let%27s_Go!_Go_Rush!!_card_artworks
	return `https://yugipedia.com/wiki/Special:Redirect/file/${probableBasename}-G002-JP-VG-artwork.png?utm_source=bastion`;
}

function createRushCardEmbed(
	card: Static<typeof RushCardSchema>,
	lang: Locale,
	limitRegulation: UpdatingLimitRegulationVector
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
	} else if (card.konami_id) {
		const limitRegulationDisplay = limitRegulation.get(card.konami_id) ?? 3;
		description += t`**Limit**: ${limitRegulationDisplay}`;
		description += "\n";
	}

	const embed = new EmbedBuilder()
		.setTitle(formatCardName(card, lang))
		.setURL(rushcard)
		.setThumbnail(videoGameIllustrationURL(card));

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
		const raceIcon = RaceIcon[race] || "";
		const localizedMonsterTypeLine = card.monster_type_line
			.split(" / ")
			.map(s => rc("monster-type-race").gettext(s))
			.join(" / ");
		const localizedAttribute = rc("attribute").gettext(card.attribute);
		description += t`**Type**: ${raceIcon} ${localizedMonsterTypeLine}`;
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
		@inject("got") private got: Got,
		@inject("limitRegulationRush") private limitRegulation: UpdatingLimitRegulationVector
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
		const artSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`art`,
			() => c("command-option-description").t`Display just the art for the Rush Duel card with this name.`
		);
		searchSubcommand
			.addStringOption(nameOption)
			.addStringOption(getInputLangStringOption())
			.addStringOption(getResultLangStringOption());
		konamiIdSubcommand.addIntegerOption(konamiIdOption).addStringOption(getResultLangStringOption());
		randomSubcommand.addStringOption(getResultLangStringOption());
		artSubcommand.addStringOption(nameOption).addStringOption(getInputLangStringOption());
		builder
			.addSubcommand(searchSubcommand)
			.addSubcommand(konamiIdSubcommand)
			.addSubcommand(randomSubcommand)
			.addSubcommand(artSubcommand);
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
		return await this.got(url, { throwHttpErrors: true }).json<Static<typeof RushCardSchema>[]>();
	}

	override async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
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

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const subcommand = interaction.options.getSubcommand(true);
		switch (subcommand) {
			case "search":
				return await this.subcommandSearch(interaction);
			case "konami-id":
				return await this.subcommandKonamiId(interaction);
			case "random":
				return await this.subcommandRandom(interaction);
			case "art":
				return await this.subcommandArt(interaction);
			default:
				throw new Error(`Unknown rush-duel subcommand: ${subcommand}`);
		}
	}

	private async searchCardNameWithCache(
		interaction: ChatInputCommandInteraction
	): Promise<number | { input: string; resultLanguage: Locale; card: Static<typeof RushCardSchema> }> {
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
		return { input, resultLanguage, card };
	}

	private async subcommandSearch(interaction: ChatInputCommandInteraction): Promise<number> {
		const result = await this.searchCardNameWithCache(interaction);
		if (typeof result === "number") {
			return result;
		}
		const { resultLanguage, card } = result;
		const embed = createRushCardEmbed(card, resultLanguage, this.limitRegulation);
		const reply = await interaction.reply({ embeds: addNotice(embed), fetchReply: true });
		return replyLatency(reply, interaction);
	}

	private async subcommandKonamiId(interaction: ChatInputCommandInteraction): Promise<number> {
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
				const embed = createRushCardEmbed(card, lang, this.limitRegulation);
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

	private async subcommandRandom(interaction: ChatInputCommandInteraction): Promise<number> {
		const [card] = await this.got(`${process.env.API_URL}/rush/random`, {
			headers: { Accept: "application/json" },
			throwHttpErrors: true
		}).json<Static<typeof RushCardSchema>[]>();
		this.#logger.info(serialiseInteraction(interaction, { response: card.yugipedia_page_id }));
		const lang = await this.locales.get(interaction);
		const embed = createRushCardEmbed(card, lang, this.limitRegulation);
		const reply = await interaction.reply({ embeds: addNotice(embed), fetchReply: true });
		return replyLatency(reply, interaction);
	}

	private async subcommandArt(interaction: ChatInputCommandInteraction): Promise<number> {
		const result = await this.searchCardNameWithCache(interaction);
		if (typeof result === "number") {
			return result;
		}
		const { resultLanguage, card } = result;
		if (!card.images) {
			const name = getRubylessCardName(card.name[resultLanguage] || `${card.konami_id}`, resultLanguage);
			useLocale(resultLanguage);
			const reply = await interaction.reply({
				content: t`Could not find art for \`${name}\`!`,
				fetchReply: true
			});
			return replyLatency(reply, interaction);
		}
		await interaction.deferReply();
		const url = videoGameIllustrationURL(card);
		const hasVideoGameIllustration = await checkYugipediaRedirect(this.got, url, (...args) =>
			this.#logger.warn(serialiseInteraction(interaction), ...args)
		);
		const switcher = new ArtSwitcher(card.images, hasVideoGameIllustration ? url : null, "rush");
		const end = Date.now();
		await switcher.editReply(interaction, resultLanguage);
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
