import { Static } from "@sinclair/typebox";
import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
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
import { formatCardName, getRubylessCardName } from "../card";
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
import {
	addTip,
	createRushCardEmbed,
	getRushCardByKonamiId,
	searchRushCard,
	suggestSearchTrigger,
	videoGameIllustration,
	videoGameIllustrationURL
} from "../rush-duel";
import { replyLatency, serialiseInteraction } from "../utils";

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
			const response = await searchRushCard(this.got, query, inputLanguage, 25);
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
			const response = await searchRushCard(this.got, input, inputLanguage, 1);
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
		const { input, resultLanguage, card } = result;
		const embed = createRushCardEmbed(card, resultLanguage, this.limitRegulation);
		const suggested = suggestSearchTrigger(input, resultLanguage === "ko");
		const reply = await interaction.reply({ embeds: [addTip(embed, suggested)], fetchReply: true });
		return replyLatency(reply, interaction);
	}

	private async subcommandKonamiId(interaction: ChatInputCommandInteraction): Promise<number> {
		const input = interaction.options.getInteger("input", true);
		this.#logger.info(serialiseInteraction(interaction, { input }));
		const card = await getRushCardByKonamiId(this.got, input);
		const lang = await this.locales.get(interaction);
		let replyOptions;
		if (!card) {
			useLocale(lang);
			replyOptions = { content: t`Could not find a card matching \`${input}\`!` };
		} else {
			const embed = createRushCardEmbed(card, lang, this.limitRegulation);
			const suggested = suggestSearchTrigger(`${input}`, lang === "ko");
			replyOptions = { embeds: [addTip(embed, `${suggested}`)] };
		}
		const reply = await interaction.reply({ ...replyOptions, fetchReply: true });
		return replyLatency(reply, interaction);
	}

	private async subcommandRandom(interaction: ChatInputCommandInteraction): Promise<number> {
		const [card] = await this.got(`${process.env.API_URL}/rush/random`, {
			headers: { Accept: "application/json" },
			throwHttpErrors: true
		}).json<Static<typeof RushCardSchema>[]>();
		this.#logger.info(serialiseInteraction(interaction, { response: card.yugipedia_page_id }));
		const lang = await this.locales.get(interaction);
		const embed = createRushCardEmbed(card, lang, this.limitRegulation);
		const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
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
		if (!card.images[0].illustration) {
			await interaction.deferReply();
			const hasVideoGameIllustration = await checkYugipediaRedirect(
				this.got,
				videoGameIllustrationURL(card),
				(...args) => this.#logger.warn(serialiseInteraction(interaction), ...args)
			);
			if (hasVideoGameIllustration) {
				card.images[0].illustration = videoGameIllustration(card);
			}
			const switcher = new ArtSwitcher(card.images, "rush");
			const end = Date.now();
			await switcher.send(interaction, "editReply", resultLanguage);
			// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
			const latency = end - interaction.createdTimestamp;
			return latency;
		}
		const switcher = new ArtSwitcher(card.images, "rush");
		const reply = await switcher.send(interaction, "reply", resultLanguage);
		return replyLatency(reply, interaction);
	}
}
