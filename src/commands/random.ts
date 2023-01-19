import { SlashCommandBuilder } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { createCardEmbed } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import { buildLocalisedCommand, getResultLangStringOption, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class RandomCommand extends Command {
	#logger = getLogger("command:random");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`random`,
			() => c("command-description").t`Get a random Yu-Gi-Oh! card.`
		)
			.addStringOption(getResultLangStringOption())
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		await interaction.deferReply();
		const url = `${process.env.API_URL}/ocg-tcg/random`;
		const cards = await this.got(url, { throwHttpErrors: true }).json<Static<typeof CardSchema>[]>();
		const lang = await this.locales.get(interaction);
		const embeds = createCardEmbed(cards[0], lang);
		const end = Date.now();
		await interaction.editReply({ embeds }); // Actually returns void
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
