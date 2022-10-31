import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { CardLookupType, getCard } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import { buildLocalisedCommand, getInputLangStringOption, Locale, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class ArtCommand extends Command {
	#logger = getLogger("command:art");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`art`,
			() => c("command-description").t`Display the art for a card!`
		);
		const nameSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`name`,
			() => c("command-option-description").t`Display the art for the card with this name.`
		);
		const nameOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Card name, fuzzy matching supported.`
		);
		const passwordSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`password`,
			() => c("command-option-description").t`Display the art for the card with this password.`
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
			() => c("command-option-description").t`Display the art for the card with this official database ID.`
		);
		const konamiIdOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`input`,
			() => c("command-option-description").t`Konami's official card database identifier.`
		);
		nameSubcommand.addStringOption(nameOption).addStringOption(getInputLangStringOption());
		passwordSubcommand.addStringOption(passwordOption);
		konamiIdSubcommand.addStringOption(konamiIdOption);
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	async getArt(card: Static<typeof CardSchema>): Promise<string | undefined> {
		const artUrl = `${process.env.IMAGE_HOST}/${card.password}.png`;
		const response = await fetch(artUrl, { method: "HEAD" });
		// 400: Bad syntax, 404: Not found
		if (response.status === 400 || response.status === 404) {
			return undefined;
		}
		// 200: OK
		if (response.status === 200) {
			return artUrl;
		}
		throw new Error((await response.json()).message);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const type = interaction.options.getSubcommand(true) as CardLookupType;
		const input = interaction.options.getString("input", true);
		const resultLanguage = await this.locales.get(interaction);
		const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
		// Send out both requests simultaneously
		const [, card] = await Promise.all([interaction.deferReply(), getCard(type, input, inputLanguage)]);
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
