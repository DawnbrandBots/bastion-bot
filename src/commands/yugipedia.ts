import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import fetch from "../fetch";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { editLatency } from "../utils";

@injectable()
export class YugiCommand extends Command {
	#logger = getLogger("command:yugi");

	constructor(metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("yugipedia")
			.setDescription("Search the Yugipedia wiki for a page and link to it.")
			.addStringOption(option =>
				option
					.setName("page")
					.setDescription("The name of the Yugipedia page you want to search for.")
					.setRequired(true)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private static YUGI_SEARCH =
		"https://yugipedia.com/api.php?action=opensearch&redirects=resolve" +
		"&prop=revisions&rvprop=content&format=json&formatversion=2&search=";

	// in old Bastion, this was part of a module, but the only other use was for KDBIDs
	// returns undefined if page could not be found
	private static async getYugipediaPage(query: string): Promise<string | undefined> {
		const fullQuery = YugiCommand.YUGI_SEARCH + encodeURIComponent(query);
		try {
			const yugiData = await (await fetch(fullQuery)).json();
			if (yugiData[3][0]) {
				return yugiData[3][0];
			} else {
				//throw new Error(Errors.ERROR_YUGI_API);
				return undefined;
			}
		} catch (e) {
			//throw new Error(Errors.ERROR_YUGI_API);
			return undefined;
		}
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const page = interaction.options.getString("page", true);
		await interaction.reply(`Searching Yugipedia for \`${page}\`…`);
		const link = await YugiCommand.getYugipediaPage(page);
		const content = link || `Could not find a Yugipedia page named \`${page}\`.`; // TODO: externalise error message for translation/non-hardcoding?
		const reply = await interaction.editReply(content);
		return editLatency(reply, interaction);
	}
}
