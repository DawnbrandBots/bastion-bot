import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { getCard, getCardSearchOptions } from "../card";
import { CardSchema } from "../definitions";
import {
	Locale,
	LocaleProvider,
	buildLocalisedChoice,
	buildLocalisedCommand,
	getKonamiIdSubcommand,
	getNameSubcommand,
	getPasswordSubcommand
} from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency, splitText } from "../utils";

export interface Price {
	set_name: string;
	set_code: string;
	set_rarity: string;
	set_price: string;
	set_url: string;
	set_edition: string;
}

@injectable()
export class PriceClient {
	constructor(@inject("got") private got: Got) {}

	async get(name: string, store?: "tcgplayer" | "cardmarket"): Promise<Price[]> {
		const url = new URL("https://ygoprodeck.com/api/card/getCardPrices.php");
		url.searchParams.set("cardname", name);
		if (store) {
			url.searchParams.set("store", store);
		}
		const response = await this.got(url, { throwHttpErrors: true });
		if (response.statusCode === 200) {
			return JSON.parse(response.body);
		}
		throw new this.got.HTTPError(response);
	}
}

interface SetInfo {
	price: number | null;
	set: string;
	url: string;
	rarity?: string;
	rarity_short?: string;
}

interface APIPrice {
	card: string;
	set_info: SetInfo[];
}

type vendorId = "tcgplayer" | "cardmarket" | "coolstuffinc";

const CHOICES_GLOBAL: Record<vendorId, () => string> = {
	tcgplayer: () => t`TCGPlayer`,
	cardmarket: () => t`Cardmarket`,
	coolstuffinc: () => t`CoolStuffInc`
};

@injectable()
export class PriceCommand extends Command {
	#logger = getLogger("command:price");

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
			() => c("command-name").t`price`,
			() => c("command-description").t`Display the price for a card!`
		);
		const vendorOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`vendor`,
			() => c("command-option-description").t`The vendor to fetch the price data from.`
		).addChoices(...Object.entries(CHOICES_GLOBAL).map(([value, name]) => buildLocalisedChoice(value, name)));
		const nameSubcommand = getNameSubcommand(
			() => c("command-option-description").t`Display the price for the card with this name.`,
			vendorOption
		);
		const passwordSubcommand = getPasswordSubcommand(
			() => c("command-option-description").t`Display the price for the card with this password.`
		).addStringOption(vendorOption);
		const konamiIdSubcommand = getKonamiIdSubcommand(
			() => c("command-option-description").t`Display the price for the card with this official database ID.`
		).addStringOption(vendorOption);
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	// specify Record type to avoid repeating type information on each property
	private vendorFormats: Record<vendorId, (locale: Locale) => Intl.NumberFormat> = {
		tcgplayer: locale => Intl.NumberFormat(locale, { style: "currency", currency: "USD" }),
		cardmarket: locale => Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }),
		coolstuffinc: locale => Intl.NumberFormat(locale, { style: "currency", currency: "USD" })
	};

	async getPrice(card: Static<typeof CardSchema>, vendor: string): Promise<APIPrice | undefined> {
		if (!card.name.en) {
			// TODO: future, determine localisation and relevance status of this error
			throw new Error(t`Sorry, I can't find the price for a card with no English name!`);
		}
		// we make sure the ID for each vendor choice is the same as its required form here
		const priceUrl = `https://db.ygoprodeck.com/queries/getPrices.php?cardone=${encodeURIComponent(
			card.name.en
		)}&vendor=${vendor}`;
		const response = await this.got(priceUrl);
		// 400: Bad syntax, 404: Not found
		if (response.statusCode === 400 || response.statusCode === 404) {
			return undefined;
		}
		// 200: OK
		if (response.statusCode === 200) {
			return JSON.parse(response.body);
		}
		throw new Error(JSON.parse(response.body).message);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const { type, input, resultLanguage, inputLanguage } = await getCardSearchOptions(interaction, this.locales);
		const vendor = interaction.options.getString("vendor", true) as vendorId;
		const card = await getCard(this.got, type, input, inputLanguage);
		if (!card) {
			useLocale(resultLanguage);
			const reply = await interaction.reply({
				content: t`Could not find a card matching \`${input}\`!`,
				fetchReply: true
			});
			return replyLatency(reply, interaction);
		} else {
			await interaction.deferReply();
			let end: number;
			const prices = await this.getPrice(card, vendor);
			if (prices) {
				useLocale(resultLanguage);
				const getLocalisedVendorName = CHOICES_GLOBAL[vendor];
				const vendorName = getLocalisedVendorName();
				const profiles = splitText(
					prices.set_info
						.map(s => {
							const rarity = s.rarity ? ` (${s.rarity})` : s.rarity_short ? ` ${s.rarity_short}` : "";
							const price =
								s.price !== null
									? this.vendorFormats[vendor](resultLanguage).format(s.price)
									: t`No market price`;
							return `[${s.set}](${s.url})${rarity}: ${price}`;
						})
						.join("\n"),
					4096
				);
				const embeds = profiles.map(p => {
					const embed = new EmbedBuilder();
					embed.setTitle(t`Prices for ${card.name[resultLanguage]} - ${vendorName}`);
					embed.setDescription(p);
					return embed;
				});
				end = Date.now();
				await interaction.editReply({ embeds: [embeds[0]] }); // Actually returns void
				embeds.shift(); // would like to use this in the line above, but its return type includes undefined
				for (const embed of embeds) {
					await interaction.followUp({ embeds: [embed] });
				}
			} else {
				const name = card.name[resultLanguage] || card.konami_id;
				useLocale(resultLanguage);
				end = Date.now();
				await interaction.editReply({ content: t`Could not find prices for \`${name}\`!` });
			}
			// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
			const latency = end - interaction.createdTimestamp;
			return latency;
		}
	}
}
