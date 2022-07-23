import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { LocaleString, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { getCard, inferInputType } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import { LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { searchQueryTypeStringOption } from "../utils";

@injectable()
export class ArtCommand extends Command {
	#logger = getLogger("command:art");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = new SlashCommandBuilder().setName("art").setDescription("Display the art for a card!");

		const option = new SlashCommandStringOption()
			.setName("input")
			.setDescription("The password, Konami ID, or name to search for a card.")
			.setRequired(true);

		for (const locale of ["zh-CN"] as LocaleString[]) {
			useLocale(locale);
			builder
				.setNameLocalization(locale, t`art`)
				.setDescriptionLocalization(locale, t`Display the art for a card!`);
			option
				.setNameLocalization(locale, t`input`)
				.setDescriptionLocalization(locale, t`The password, Konami ID, or name to search for a card.`);
		}

		builder.addStringOption(option).addStringOption(searchQueryTypeStringOption);

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

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		let type = interaction.options.getString("type", false) as "password" | "kid" | "name" | undefined;
		let input = interaction.options.getString("input", true);
		[type, input] = inferInputType(type, input);
		await interaction.deferReply();
		const card = await getCard(type, input);
		let end: number;
		if (!card) {
			end = Date.now();
			// TODO: include properly-named type in this message
			useLocale(interaction.locale);
			await interaction.editReply({ content: t`Could not find a card matching \`${input}\`!` });
		} else {
			const artUrl = await this.getArt(card);
			end = Date.now();
			if (artUrl) {
				// expected embedding of image from URL
				await interaction.editReply(artUrl); // Actually returns void
			} else {
				const lang = (await this.locales.get(interaction)) as "en" | "fr" | "de" | "it" | "pt";
				const name = card[lang]?.name || card.kid;
				useLocale(interaction.locale);
				await interaction.editReply({ content: t`Could not find art for \`${name}\`!` });
			}
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
