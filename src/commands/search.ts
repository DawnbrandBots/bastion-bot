import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { createCardEmbed, getCard, inferInputType } from "../card";
import { Command } from "../Command";
import { getInputLangStringOption, getResultLangStringOption, Locale, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { addFunding, addNotice, searchQueryTypeStringOption } from "../utils";

@injectable()
export class SearchCommand extends Command {
	#logger = getLogger("command:search");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("search")
			.setDescription("Find all information on a card!")
			.addStringOption(
				new SlashCommandStringOption()
					.setName("input")
					.setDescription("The password, Konami ID, or name you're searching by.")
					.setRequired(true)
			)
			.addStringOption(getInputLangStringOption())
			.addStringOption(getResultLangStringOption())
			.addStringOption(searchQueryTypeStringOption)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const [type, input] = inferInputType(interaction);
		const resultLanguage = await this.locales.get(interaction);
		const inputLanguage = (interaction.options.getString("input-language") as Locale) ?? resultLanguage;
		await interaction.deferReply();
		const card = await getCard(type, input, inputLanguage);
		let end: number;
		if (!card) {
			end = Date.now();
			useLocale(resultLanguage);
			await interaction.editReply({ content: t`Could not find a card matching \`${input}\`!` });
		} else {
			let embeds = createCardEmbed(card, resultLanguage);
			embeds = addFunding(addNotice(embeds));
			end = Date.now();
			await interaction.editReply({ embeds }); // Actually returns void
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
