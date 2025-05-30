import {
	SlashCommandAttachmentOption,
	SlashCommandBooleanOption,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder
} from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
	ActionRowBuilder,
	Attachment,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder
} from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, msgid, ngettext, t, useLocale } from "ttag";
import { typedDeckToYdk, ydkToTypedDeck } from "ydeck";
import { TypedDeck, parseURL, toURL } from "ydke";
import { Command } from "../Command";
import { getRubylessCardName } from "../card";
import { CardSchema } from "../definitions";
import { COMMAND_LOCALIZATIONS, Locale, LocaleProvider, everywhereCommand } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { addNotice, serialiseInteraction, splitText } from "../utils";

// Same hack as in card.ts
const rc = c;

@injectable()
export class DeckCommand extends Command {
	#logger = getLogger("command:deck");

	constructor(
		@inject(Metrics) metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = everywhereCommand()
			.setName("deck")
			.setDescription(
				"Display a deck list from ydke:// or .ydk format, exported from a number of deck building programs."
			);
		const urlSubcommand = new SlashCommandSubcommandBuilder()
			.setName("url")
			.setDescription("View a deck by entering a ydke:// URL.");
		const fileSubcommand = new SlashCommandSubcommandBuilder()
			.setName("file")
			.setDescription("View a deck by uploading a .ydk file.");
		const deckUrlOption = new SlashCommandStringOption()
			.setName("deck")
			.setDescription("The ydke:// URL of the deck you want to view.")
			.setRequired(true);
		const deckFileOption = new SlashCommandAttachmentOption()
			.setName("deck")
			.setDescription("The .ydk file of the deck you want to view.")
			.setRequired(true);
		const publicOption = new SlashCommandBooleanOption()
			.setName("public")
			.setDescription("Whether to display the deck details publicly in chat. This is false by default.")
			.setRequired(false);
		const stackedOption = new SlashCommandBooleanOption()
			.setName("stacked")
			.setDescription(
				"Whether to display the deck sections as one stacked column. This is false (side-by-side) by default."
			)
			.setRequired(false);

		for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
			useLocale(gettext);
			builder
				.setNameLocalization(discord, c("command-name").t`deck`)
				.setDescriptionLocalization(
					discord,
					c("command-description")
						.t`Display a deck list from ydke:// or .ydk format, exported from a number of deck building programs.`
				);
			urlSubcommand
				.setNameLocalization(discord, c("command-option").t`url`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description").t`View a deck by entering a ydke:// URL.`
				);
			fileSubcommand
				.setNameLocalization(discord, c("command-option").t`file`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description").t`View a deck by uploading a .ydk file.`
				);
			deckUrlOption
				.setNameLocalization(discord, c("command-option").t`deck`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description").t`The ydke:// URL of the deck you want to view.`
				);
			deckFileOption
				.setNameLocalization(discord, c("command-option").t`deck`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description").t`The .ydk file of the deck you want to view.`
				);
			publicOption
				.setNameLocalization(discord, c("command-option").t`public`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description")
						.t`Whether to display the deck details publicly in chat. This is false by default.`
				);
			stackedOption
				.setNameLocalization(discord, c("command-option").t`stacked`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description")
						.t`Whether to display the deck sections as one stacked column. This is false (side-by-side) by default.`
				);
		}

		urlSubcommand.addStringOption(deckUrlOption).addBooleanOption(publicOption).addBooleanOption(stackedOption);
		fileSubcommand
			.addAttachmentOption(deckFileOption)
			.addBooleanOption(publicOption)
			.addBooleanOption(stackedOption);

		builder.addSubcommand(urlSubcommand).addSubcommand(fileSubcommand);

		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	async getCards(cards: Set<number>): Promise<Map<number, Static<typeof CardSchema>>> {
		const response = await this.got(`${process.env.API_URL}/ocg-tcg/multi?password=${[...cards].join(",")}`, {
			throwHttpErrors: true,
			timeout: 5000
		});
		const body: (Static<typeof CardSchema> | null)[] = JSON.parse(response.body);
		const cardMemo = new Map<number, Static<typeof CardSchema>>();
		for (const card of body) {
			if (card?.password) {
				cardMemo.set(card.password, card);
			}
			if (card?.fake_password) {
				if (Array.isArray(card.fake_password)) {
					for (const password of card.fake_password) {
						cardMemo.set(password, card);
					}
				} else {
					cardMemo.set(card.fake_password, card);
				}
			}
		}
		return cardMemo;
	}

	async generateProfile(deck: TypedDeck, lang: Locale, inline: boolean, outUrl: string): Promise<EmbedBuilder> {
		// use Set to remove duplicates from list of passwords to pass to API
		// populate the names into a Map to be fetched linearly
		const cardMemo = await this.getCards(new Set([...deck.main, ...deck.extra, ...deck.side]));
		// apply the names to the record of the deck
		function getName(password: number): string {
			const name = getRubylessCardName(cardMemo.get(password)?.name[lang], lang);
			return name || cardMemo.get(password)?.name.en || `${password}`;
		}
		const namedDeck = {
			main: [...deck.main].map(getName),
			extra: [...deck.extra].map(getName),
			side: [...deck.side].map(getName)
		};
		// count the number of each card in the deck
		const count = (acc: Record<string, number>, val: string): Record<string, number> => {
			acc[val] = acc[val] ? acc[val] + 1 : 1;
			return acc;
		};
		const deckCounts = {
			main: namedDeck.main.reduce(count, {}),
			extra: namedDeck.extra.reduce(count, {}),
			side: namedDeck.side.reduce(count, {})
		};
		useLocale(lang);
		// count the number of each meaningful card type in the deck and construct embed
		function countMain(deck: Uint32Array): string {
			const counts = {
				Monster: 0,
				Spell: 0,
				Trap: 0
			};
			for (const password of deck) {
				const card = cardMemo.get(password);
				if (card) {
					counts[card.card_type]++;
				}
			}
			const display = [];
			if (counts.Monster) {
				display.push(ngettext(msgid`${counts.Monster} Monster`, `${counts.Monster} Monsters`, counts.Monster));
			}
			if (counts.Spell) {
				display.push(ngettext(msgid`${counts.Spell} Spell`, `${counts.Spell} Spells`, counts.Spell));
			}
			if (counts.Trap) {
				display.push(ngettext(msgid`${counts.Trap} Trap`, `${counts.Trap} Traps`, counts.Trap));
			}
			return display.join(", ");
		}
		function countExtraMonsterTypes(deck: Uint32Array): string {
			// Can be genericized for future use
			const types = ["Fusion", "Synchro", "Xyz", "Link"] as const;
			const counts = Object.fromEntries(types.map(type => [type, 0]));
			for (const password of deck) {
				const card = cardMemo.get(password);
				if (card?.card_type === "Monster") {
					const currentMonsterTypes = new Set(card.monster_type_line.split(" / "));
					for (const type of types) {
						if (currentMonsterTypes.has(type)) {
							counts[type]++;
							break; // assumption: mutually exclusive
						}
					}
				}
			}
			// Translations have already been configured in card.ts
			return Object.entries(counts)
				.filter(([, count]) => count > 0)
				.map(([type, count]) => `${count} ${rc("monster-type-race").gettext(type)}`)
				.join(", ");
		}
		const printCount = ([cardName, count]: [string, number]): string => `${count} ${cardName}`;
		const embed = new EmbedBuilder();
		embed.setTitle(t`Your Deck`);
		if (deck.main.length > 0) {
			const content = Object.entries(deckCounts.main).map(printCount).join("\n");
			const [first, ...rest] = splitText(content);
			const countDetail = countMain(deck.main);
			const name = ngettext(
				msgid`Main Deck (${deck.main.length} card — ${countDetail})`,
				`Main Deck (${deck.main.length} cards — ${countDetail})`,
				deck.main.length
			);
			embed.addFields({ name, value: first, inline });
			for (const part of rest) {
				embed.addFields({ name: t`Main Deck (continued)`, value: part, inline });
			}
		}
		if (deck.extra.length > 0) {
			const content = Object.entries(deckCounts.extra).map(printCount).join("\n");
			const [first, ...rest] = splitText(content);
			const countDetail = countExtraMonsterTypes(deck.extra);
			const name = ngettext(
				msgid`Extra Deck (${deck.extra.length} card — ${countDetail})`,
				`Extra Deck (${deck.extra.length} cards — ${countDetail})`,
				deck.extra.length
			);
			embed.addFields({ name, value: first, inline });
			for (const part of rest) {
				embed.addFields({ name: t`Extra Deck (continued)`, value: part, inline });
			}
		}
		if (deck.side.length > 0) {
			const content = Object.entries(deckCounts.side).map(printCount).join("\n");
			const [first, ...rest] = splitText(content);
			const countDetail = countMain(deck.side);
			const name = ngettext(
				msgid`Side Deck (${deck.side.length} card — ${countDetail})`,
				`Side Deck (${deck.side.length} cards — ${countDetail})`,
				deck.side.length
			);
			embed.addFields({ name, value: first, inline });
			for (const part of rest) {
				embed.addFields({ name: t`Side Deck (continued)`, value: part, inline });
			}
		}
		embed.addFields({ name: t`ydke URL`, value: outUrl, inline: false });
		return embed;
	}

	async parseFile(deck: Attachment): Promise<TypedDeck> {
		// Various guards for malicious or non-deck content before we bother downloading
		if (!deck.name?.endsWith(".ydk")) {
			throw new Error(t`.ydk files must have the .ydk extension!`);
		}
		if (deck.size > 1024) {
			throw new Error(t`.ydk files should not be larger than 1 KB!`);
		}
		const ydk = await this.got(deck.url).text();
		return ydkToTypedDeck(ydk);
	}

	protected log(interaction: ChatInputCommandInteraction, error: Error): void {
		this.logger.info(serialiseInteraction(interaction), error);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const resultLanguage = await this.locales.get(interaction);
		let deck: TypedDeck;
		const isPublic = !!interaction.options.getBoolean("public", false);
		const isStacked = !!interaction.options.getBoolean("stacked", false);

		// defer earlier than before adding .ydk support because that requires fetching a file
		await interaction.deferReply({ ephemeral: !isPublic });

		if (interaction.options.getSubcommand() === "url") {
			try {
				deck = parseURL(interaction.options.getString("deck", true));
			} catch (e) {
				// TODO: specifically catch error for bad input and respond more clearly?
				const end = Date.now();
				const error = e as Error;
				this.log(interaction, error);
				await interaction.editReply({
					content: error.message
				});
				const latency = end - interaction.createdTimestamp;
				return latency;
			}
		} else {
			// subcommand === "file"
			try {
				deck = await this.parseFile(interaction.options.getAttachment("deck", true));
			} catch (e) {
				const end = Date.now();
				const error = e as Error;
				this.log(interaction, error);
				await interaction.editReply({
					content: error.message
				});
				const latency = end - interaction.createdTimestamp;
				return latency;
			}
		}

		// return error on empty deck
		if (deck.main.length + deck.extra.length + deck.side.length < 1) {
			useLocale(resultLanguage);
			const end = Date.now();
			this.logger.info(serialiseInteraction(interaction), "empty deck");
			await interaction.editReply({
				content: t`Error: Your deck is empty.`
			});
			const latency = end - interaction.createdTimestamp;
			return latency;
		}

		// one of these two will be redundant with an input, but if it's the file then we'd have to download it again
		const outUrl = toURL(deck);
		const outFile = typedDeckToYdk(deck);

		this.logger.info(serialiseInteraction(interaction), outUrl);
		const content = await this.generateProfile(deck, resultLanguage, !isStacked, outUrl);

		useLocale(resultLanguage);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel(t`Upload to YGOPRODECK`)
				.setStyle(ButtonStyle.Link)
				.setURL(
					`https://ygoprodeck.com/deckbuilder/?utm_source=bastion&y=${encodeURIComponent(outUrl.slice(7))}`
				)
		);

		// a string is interpreted as a path, to upload it as a file we need a Buffer
		const deckBuffer = Buffer.from(outFile, "utf-8");

		// save to re-use when we later edit the message
		const embeds = addNotice(content);
		const attachment = new AttachmentBuilder(deckBuffer).setName("deck.ydk");

		const end = Date.now();
		await interaction.editReply({
			embeds,
			files: [attachment],
			components: [row]
		});

		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
