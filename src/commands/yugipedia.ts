import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { COMMAND_LOCALIZATIONS, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { editLatency } from "../utils";

@injectable()
export class YugiCommand extends Command {
	#logger = getLogger("command:yugi");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = new SlashCommandBuilder()
			.setName("yugipedia")
			.setDescription("Search the Yugipedia wiki for a page and link to it.");

		const option = new SlashCommandStringOption()
			.setName("page")
			.setDescription("The name of the Yugipedia page you want to search for.")
			.setRequired(true);

		for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
			useLocale(gettext);
			builder
				.setNameLocalization(discord, c("command-name").t`yugipedia`)
				.setDescriptionLocalization(
					discord,
					c("command-description").t`Search the Yugipedia wiki for a page and link to it.`
				);
			option
				.setNameLocalization(discord, c("command-option").t`page`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description").t`The name of the Yugipedia page you want to search for.`
				);
		}

		builder.addStringOption(option);

		return builder.toJSON();
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
		const lang = await this.locales.get(interaction);
		useLocale(lang);
		await interaction.reply(t`Searching Yugipedia for \`${page}\`…`);
		const link = await YugiCommand.getYugipediaPage(page);
		useLocale(lang);
		const content = link || t`Could not find a Yugipedia page named \`${page}\`.`;
		const reply = await interaction.editReply(content);
		return editLatency(reply, interaction);
	}
}
