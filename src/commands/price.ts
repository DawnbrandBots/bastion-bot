import { SlashCommandStringOption } from "@discordjs/builders";
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
	everywhereCommand,
	getKonamiIdSubcommand,
	getNameSubcommand,
	getPasswordSubcommand
} from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { splitText } from "../utils";

export interface Price {
	set_name: string;
	set_code: string;
	set_rarity: string;
	set_price: string;
	set_url: string;
	set_edition: string;
}

type Vendor = "tcgplayer" | "cardmarket";

@injectable()
export class PriceClient {
	constructor(@inject("got") private got: Got) {}

	async get(name: string, store?: Vendor): Promise<Price[]> {
		const url = new URL("https://ygoprodeck.com/api/card/getCardPrices.php");
		url.searchParams.set("cardname", name);
		if (store) {
			url.searchParams.set("store", store);
		}
		const response = await this.got(url, { throwHttpErrors: true, timeout: 10000 });
		if (response.statusCode === 200) {
			return JSON.parse(response.body);
		}
		throw new this.got.HTTPError(response);
	}
}

// Get the appropriate 'cardname' parameter for the API. Prefer numeric values
// due to API bugs with processing URL-encoded English card names.
function resolveKey(card: Static<typeof CardSchema>): string {
	if (card.password) {
		return `${card.password}`;
	}
	if (typeof card.fake_password === "number") {
		return `${card.fake_password}`;
	}
	if (Array.isArray(card.fake_password) && card.fake_password.length) {
		return `${card.fake_password[0]}`;
	}
	return `${card.name.en}`;
}

const CHOICES_GLOBAL = {
	tcgplayer: () => t`TCGPlayer`,
	cardmarket: () => t`Cardmarket`
};

@injectable()
export class PriceCommand extends Command {
	#logger = getLogger("command:price");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got,
		private prices: PriceClient
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			everywhereCommand(),
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
	private vendorFormats: Record<Vendor, (locale: Locale) => Intl.NumberFormat> = {
		tcgplayer: locale => Intl.NumberFormat(locale, { style: "currency", currency: "USD" }),
		cardmarket: locale => Intl.NumberFormat(locale, { style: "currency", currency: "EUR" })
	};

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const { type, input, resultLanguage, inputLanguage } = await getCardSearchOptions(interaction, this.locales);
		const vendor = interaction.options.getString("vendor", true) as Vendor;
		await interaction.deferReply();
		let end: number;
		const card = await getCard(this.got, type, input, inputLanguage);
		if (!card) {
			useLocale(resultLanguage);
			end = Date.now();
			await interaction.editReply({
				content: t`Could not find a card matching \`${input}\`!`
			});
		} else {
			const printings = await this.prices.get(resolveKey(card), vendor);
			if (printings && printings.length) {
				useLocale(resultLanguage);
				const getLocalisedVendorName = CHOICES_GLOBAL[vendor];
				const vendorName = getLocalisedVendorName();
				const profiles = splitText(
					printings
						.map(card => {
							// Reported prices above 1000 are formatted with commas, e.g. 1,731.23
							const price = Number(card.set_price.replace(",", ""));
							const formattedPrice =
								price > 0
									? `**${this.vendorFormats[vendor](resultLanguage).format(price)}**`
									: t`No market price`;
							return `${card.set_code} ${formattedPrice} [${card.set_name}](${card.set_url}) (${card.set_rarity})`;
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
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
