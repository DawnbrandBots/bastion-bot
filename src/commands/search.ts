import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { CardLookupType, createCardEmbed, getCard } from "../card";
import { Command } from "../Command";
import {
	buildLocalisedCommand,
	getInputLangStringOption,
	getResultLangStringOption,
	Locale,
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
		const nameSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`name`,
			() => c("command-option-description").t`Find all information for the card with this name.`
		);
		const nameOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Card name, fuzzy matching supported.`
		);
		const passwordSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`password`,
			() => c("command-option-description").t`Find all information for the card with this password.`
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
			() => c("command-option-description").t`Find all information for the card with this official database ID.`
		);
		const konamiIdOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Konami's official card database identifier.`
		);
		nameSubcommand
			.addStringOption(nameOption)
			.addStringOption(getInputLangStringOption())
			.addStringOption(getResultLangStringOption());
		passwordSubcommand.addStringOption(passwordOption).addStringOption(getResultLangStringOption());
		konamiIdSubcommand.addStringOption(konamiIdOption).addStringOption(getResultLangStringOption());
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const type = interaction.options.getSubcommand(true) as CardLookupType;
		const input = interaction.options.getString("input", true);
		const resultLanguage = await this.locales.get(interaction);
		const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
		// Send out both requests simultaneously
		const [, card] = await Promise.all([interaction.deferReply(), getCard(this.got, type, input, inputLanguage)]);
		let end: number;
		if (!card) {
			end = Date.now();
			useLocale(resultLanguage);
			await interaction.editReply({ content: t`Could not find a card matching \`${input}\`!` });
		} else {
			const embeds = createCardEmbed(card, resultLanguage);
			end = Date.now();
			await interaction.editReply({ embeds }); // Actually returns void
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
