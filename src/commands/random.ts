import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { createCardEmbed } from "../card";
import { Command } from "../Command";
import { buildLocalisedCommand, getResultLangStringOption, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { addFunding, addNotice } from "../utils";

@injectable()
export class RandomCommand extends Command {
	#logger = getLogger("command:random");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
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

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		await interaction.deferReply();
		const response = await fetch(`${process.env.SEARCH_API}/yaml-yugi/random`);
		const cards = await response.json();
		const lang = await this.locales.get(interaction);
		let embeds = createCardEmbed(cards[0], lang);
		embeds = addFunding(addNotice(embeds));
		const end = Date.now();
		await interaction.editReply({ embeds }); // Actually returns void
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
