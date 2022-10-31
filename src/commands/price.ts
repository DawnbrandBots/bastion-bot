import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { CardLookupType, getCard } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions/yaml-yugi";
import {
	buildLocalisedChoice,
	buildLocalisedCommand,
	getInputLangStringOption,
	Locale,
	LocaleProvider
} from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { splitText } from "../utils";

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

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`price`,
			() => c("command-description").t`Display the price for a card!`
		);
		const nameSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`name`,
			() => c("command-option-description").t`Display the price for the card with this name.`
		);
		const nameOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Card name, fuzzy matching supported.`
		);
		const passwordSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`password`,
			() => c("command-option-description").t`Display the price for the card with this password.`
		);
		const passwordOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() =>
				c("command-option-description")
					.t`Card password, the eight-digit number printed on the bottom left corner.`
		);
		const konamiIdSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`konami-id`,
			() => c("command-option-description").t`Display the price for the card with this official database ID.`
		);
		const konamiIdOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Konami's official card database identifier.`
		);
		const vendorOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`vendor`,
			() => c("command-option-description").t`The vendor to fetch the price data from.`
		).addChoices(...Object.entries(CHOICES_GLOBAL).map(([value, name]) => buildLocalisedChoice(value, name)));
		nameSubcommand
			.addStringOption(nameOption)
			.addStringOption(vendorOption)
			.addStringOption(getInputLangStringOption());
		passwordSubcommand.addStringOption(passwordOption).addStringOption(vendorOption);
		konamiIdSubcommand.addStringOption(konamiIdOption).addStringOption(vendorOption);
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	// TODO: i18n
	private vendorFormats = {
		tcgplayer: (price: number): string => `$${price.toFixed(2)}`,
		cardmarket: (price: number): string => `€${price.toFixed(2)}`,
		coolstuffinc: (price: number): string => `$${price.toFixed(2)}`
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
		const response = await fetch(priceUrl);
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

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const type = interaction.options.getSubcommand(true) as CardLookupType;
		const input = interaction.options.getString("input", true);
		const resultLanguage = await this.locales.get(interaction);
		const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
		const vendor = interaction.options.getString("vendor", true) as vendorId;
		// Send out both requests simultaneously
		const [, card] = await Promise.all([interaction.deferReply(), getCard(true, type, input, inputLanguage)]);
		let end: number;
		if (!card) {
			end = Date.now();
			useLocale(resultLanguage);
			await interaction.editReply({ content: t`Could not find a card matching \`${input}\`!` });
		} else {
			const prices = await this.getPrice(card, vendor);
			if (prices) {
				useLocale(resultLanguage);
				const getLocalisedVendorName = CHOICES_GLOBAL[vendor];
				const vendorName = getLocalisedVendorName();
				const profiles = splitText(
					prices.set_info
						.map(s => {
							const rarity = s.rarity ? ` (${s.rarity})` : s.rarity_short ? ` ${s.rarity_short}` : "";
							const price = s.price !== null ? this.vendorFormats[vendor](s.price) : t`No market price`;
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
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
