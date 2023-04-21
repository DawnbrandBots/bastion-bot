import { Static } from "@sinclair/typebox";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	BaseMessageOptions,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	DiscordAPIError,
	DiscordjsErrorCodes,
	EmbedBuilder,
	Message,
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
import { AttributeIcon, Colour, Icon, RaceIcon, formatCardName, formatCardText } from "../card";
import { RushCardSchema } from "../definitions/rush";
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
	return `https://yugipedia.com/wiki/Special:Redirect/file/${probableBasename}-G002-JP-VG-artwork.png`;
}

function createRushCardEmbed(card: Static<typeof RushCardSchema>, lang: Locale): EmbedBuilder {
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

	const illustration = `${videoGameIllustrationURL(card)}?utm_source=bastion`;
	const embed = new EmbedBuilder().setTitle(formatCardName(card, lang)).setURL(rushcard).setThumbnail(illustration);

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
		const embed = createRushCardEmbed(card, resultLanguage);
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

	private async subcommandRandom(interaction: ChatInputCommandInteraction): Promise<number> {
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

	private async checkYugipediaRedirect(url: string, interaction: ChatInputCommandInteraction): Promise<boolean> {
		try {
			const response = await this.got(url, {
				method: "HEAD",
				followRedirect: false,
				timeout: 2000
			});
			if (response.statusCode === 302) {
				// MediaWiki Special:Redirect/file should only use 302s
				return true;
			} else if (response.statusCode !== 404) {
				this.#logger.warn(serialiseInteraction(interaction, { redirectStatusCode: response.statusCode }));
			}
		} catch (error) {
			this.#logger.warn(serialiseInteraction(interaction), error);
		}
		return false;
	}

	private async subcommandArt(interaction: ChatInputCommandInteraction): Promise<number> {
		const result = await this.searchCardNameWithCache(interaction);
		if (typeof result === "number") {
			return result;
		}
		const { input, resultLanguage, card } = result;
		if (!card.images) {
			useLocale(resultLanguage);
			const reply = await interaction.reply({
				content: t`Could not find art for \`${input}\`!`,
				fetchReply: true
			});
			return replyLatency(reply, interaction);
		}
		const url = videoGameIllustrationURL(card);
		const hasVideoGameIllustration = await this.checkYugipediaRedirect(url, interaction);
		const switcher = new ArtSwitcher(card.images, hasVideoGameIllustration ? url : null);
		const reply = await switcher.reply(interaction, resultLanguage);
		return replyLatency(reply, interaction);
	}
}

class ArtSwitcher {
	private logger = getLogger("command:rush:switcher");

	private readonly labelButton = new ButtonBuilder()
		.setCustomId("label")
		.setStyle(ButtonStyle.Primary)
		.setDisabled(true);
	private readonly prevButton = new ButtonBuilder()
		.setCustomId("prev")
		.setEmoji("⬅")
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true);
	private readonly nextButton = new ButtonBuilder()
		.setCustomId("next")
		.setEmoji("➡")
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true);
	private readonly components = [
		new ActionRowBuilder<ButtonBuilder>().addComponents(this.labelButton, this.prevButton, this.nextButton)
	];

	private index = 0;

	constructor(
		private readonly images: NonNullable<Static<typeof RushCardSchema>["images"]>,
		private readonly videoGameIllustration: string | null
	) {
		this.labelButton.setLabel(this.label);
		this.nextButton.setDisabled(images.length === 1);
	}

	private get label(): string {
		return `${this.index + 1} / ${this.images.length}`;
	}

	private get currentImage(): string {
		// The video game illustration, if it exists, may replace the first image
		return (
			(this.index === 0 && this.videoGameIllustration) ||
			`https://yugipedia.com/wiki/Special:Redirect/file/${this.images[this.index].image}?utm_source=bastion`
		);
	}

	private get replyOptions(): BaseMessageOptions {
		return {
			content: this.currentImage,
			components: this.components
		};
	}

	private onClick(interaction: ButtonInteraction): void {
		if (interaction.customId === "prev") {
			if (this.index > 0) {
				this.index--;
			}
		} else {
			if (this.index < this.images.length - 1) {
				this.index++;
			}
		}
		this.prevButton.setDisabled(this.index === 0);
		this.nextButton.setDisabled(this.index === this.images.length - 1);
		this.labelButton.setLabel(this.label);
	}

	async reply(parentInteraction: ChatInputCommandInteraction, resultLanguage: Locale): Promise<Message> {
		const reply = await parentInteraction.reply({ ...this.replyOptions, fetchReply: true });
		const filter = (childInteraction: ButtonInteraction): boolean => {
			this.logger.info(serialiseInteraction(parentInteraction), `click: ${childInteraction.user.id}`);
			if (childInteraction.user.id === parentInteraction.user.id) {
				return true;
			}
			useLocale(resultLanguage);
			childInteraction
				.reply({
					content: t`Buttons can only be used by the user who called Bastion.`,
					ephemeral: true
				})
				.catch(e => this.logger.error(serialiseInteraction(parentInteraction), e));
			return false;
		};
		// Set up the button handler (don't await) and return the initial reply
		const awaitOptions = { filter, componentType: ComponentType.Button, time: 60000 } as const;
		const then = async (childInteraction: ButtonInteraction): Promise<void> => {
			this.onClick(childInteraction);
			// We have to set up the handler again because Discord.js is forcing the maximum number of events to 1
			// https://github.com/discordjs/discord.js/blob/fb70df817c6566ca100d57ec1878a4573489a43d/packages/discord.js/src/structures/InteractionResponse.js#L30
			(await childInteraction.update(this.replyOptions))
				.awaitMessageComponent(awaitOptions)
				.then(then)
				.catch(catcher);
		};
		const catcher = async (err: DiscordAPIError): Promise<void> => {
			// a rejection can just mean the timeout was reached without a response
			// otherwise, though, we want to treat it as a normal error
			if (err.code !== DiscordjsErrorCodes.InteractionCollectorError) {
				this.logger.error(serialiseInteraction(parentInteraction), err);
			}
			// disable original buttons, regardless of error source
			this.prevButton.setDisabled(true);
			this.nextButton.setDisabled(true);
			parentInteraction
				.editReply(this.replyOptions)
				.catch(e => this.logger.error(serialiseInteraction(parentInteraction), e));
		};
		reply.awaitMessageComponent(awaitOptions).then(then).catch(catcher);
		return reply;
	}
}
