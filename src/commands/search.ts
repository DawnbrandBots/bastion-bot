import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { createCardEmbed, getCard, getCardSearchOptions } from "../card";
import { Command } from "../Command";
import {
	buildLocalisedCommand,
	getKonamiIdSubcommand,
	getNameSubcommand,
	getPasswordSubcommand,
	getResultLangStringOption,
	LocaleProvider
} from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class SearchCommand extends Command {
	#logger = getLogger("command:search");

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
			() => c("command-name").t`search`,
			() => c("command-description").t`Find all information on a card!`
		);
		const nameSubcommand = getNameSubcommand(
			() => c("command-option-description").t`Find all information for the card with this name.`
		).addStringOption(getResultLangStringOption());
		const passwordSubcommand = getPasswordSubcommand(
			() => c("command-option-description").t`Find all information for the card with this password.`
		).addStringOption(getResultLangStringOption());
		const konamiIdSubcommand = getKonamiIdSubcommand(
			() => c("command-option-description").t`Find all information for the card with this official database ID.`
		).addStringOption(getResultLangStringOption());
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const { type, input, resultLanguage, inputLanguage } = await getCardSearchOptions(interaction, this.locales);
		const card = await getCard(this.got, type, input, inputLanguage);
		let end: number;
		if (!card) {
			end = Date.now();
			useLocale(resultLanguage);
			await interaction.reply({ content: t`Could not find a card matching \`${input}\`!` });
		} else {
			const embeds = createCardEmbed(card, resultLanguage);
			end = Date.now();
			await interaction.reply({ embeds }); // Actually returns void
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
