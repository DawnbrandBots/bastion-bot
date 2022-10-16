import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import fetch from "../fetch";
import { buildLocalisedCommand, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { editLatency } from "../utils";

@injectable()
export class YGOPRODECKCommand extends Command {
	#logger = getLogger("command:ygoprodeck");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`ygoprodeck`,
			() => c("command-description").t`Search the YGOPRODECK card database.`
		);
		const option = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`term`,
			() => c("command-option-description").t`The name or password of the card you're looking for.`
		);
		builder.addStringOption(option);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private async search(term: string): Promise<string> {
		const url = new URL("https://db.ygoprodeck.com/carddbsearch_name.php");
		url.searchParams.set("term", term);
		const response = await (await fetch(url)).json();
		if ("error" in response) {
			return response.error;
		} else {
			return `https://db.ygoprodeck.com/card/?search=${encodeURIComponent(response.name)}`;
		}
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const term = interaction.options.getString("term", true);
		const lang = await this.locales.get(interaction);
		useLocale(lang);
		await interaction.reply(t`Searching YGOPRODECK for \`${term}\`…`);
		const result = await this.search(term);
		const reply = await interaction.editReply(result);
		return editLatency(reply, interaction);
	}
}
