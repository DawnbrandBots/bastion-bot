import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { createCardEmbed, getCard, getCardSearchOptions } from "../card";
import { UpdatingLimitRegulationVector } from "../limit-regulation";
import {
	LocaleProvider,
	buildLocalisedCommand,
	getKonamiIdSubcommand,
	getNameSubcommand,
	getPasswordSubcommand,
	getResultLangStringOption
} from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class SearchCommand extends Command {
	#logger = getLogger("command:search");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got,
		@inject("limitRegulationMasterDuel") private masterDuelLimitRegulation: UpdatingLimitRegulationVector
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
		let replyOptions;
		if (!card) {
			useLocale(resultLanguage);
			replyOptions = { content: t`Could not find a card matching \`${input}\`!` };
		} else {
			const embeds = createCardEmbed(card, resultLanguage, this.masterDuelLimitRegulation);
			replyOptions = { embeds };
		}
		const reply = await interaction.reply({ ...replyOptions, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
