import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { createCardEmbed, getCard, inferInputType } from "../card";
import { Command } from "../Command";
import { LocaleProvider } from "../locale";
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
			.addStringOption(
				new SlashCommandStringOption()
					.setName("lang")
					.setDescription("The result language.")
					.setRequired(false)
					.addChoices(
						{ name: "English", value: "en" },
						{ name: "Français", value: "fr" },
						{ name: "Deutsch", value: "de" },
						{ name: "Italiano", value: "it" },
						{ name: "Português", value: "pt" }
					)
			)
			.addStringOption(searchQueryTypeStringOption)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
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
			await interaction.editReply({ content: `Could not find a card matching \`${input}\`!` });
		} else {
			const lang = interaction.options.getString("lang") ?? (await this.locales.get(interaction));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let embeds = createCardEmbed(card, lang as any);
			embeds = addFunding(addNotice(embeds));
			end = Date.now();
			await interaction.editReply({ embeds }); // Actually returns void
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
