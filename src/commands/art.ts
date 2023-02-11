import { SlashCommandBuilder } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { getCard, getCardSearchOptions } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import {
	buildLocalisedCommand,
	getKonamiIdSubcommand,
	getNameSubcommand,
	getPasswordSubcommand,
	LocaleProvider
} from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class ArtCommand extends Command {
	#logger = getLogger("command:art");

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
			() => c("command-name").t`art`,
			() => c("command-description").t`Display the art for a card!`
		);
		const nameSubcommand = getNameSubcommand(
			() => c("command-option-description").t`Display the art for the card with this name.`
		);
		const passwordSubcommand = getPasswordSubcommand(
			() => c("command-option-description").t`Display the art for the card with this password.`
		);
		const konamiIdSubcommand = getKonamiIdSubcommand(
			() => c("command-option-description").t`Display the art for the card with this official database ID.`
		);
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	async getArt(card: Static<typeof CardSchema>): Promise<string | undefined> {
		const artUrl = `${process.env.IMAGE_HOST}/${card.password}.png`;
		const response = await this.got.head(artUrl);
		return response.statusCode === 200 ? artUrl : undefined;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const { type, input, resultLanguage, inputLanguage } = await getCardSearchOptions(interaction, this.locales);
		// Send out both requests simultaneously
		const [, card] = await Promise.all([interaction.deferReply(), getCard(this.got, type, input, inputLanguage)]);
		let end: number;
		if (!card) {
			end = Date.now();
			useLocale(resultLanguage);
			await interaction.editReply({ content: t`Could not find a card matching \`${input}\`!` });
		} else {
			const artUrl = await this.getArt(card);
			end = Date.now();
			if (artUrl) {
				// expected embedding of image from URL
				await interaction.editReply(artUrl); // Actually returns void
			} else {
				const name = card.name[resultLanguage] || card.konami_id;
				useLocale(resultLanguage);
				await interaction.editReply({ content: t`Could not find art for \`${name}\`!` });
			}
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
