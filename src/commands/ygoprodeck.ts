import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { AutocompletableCommand } from "../Command";
import { buildLocalisedCommand, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { editLatency } from "../utils";

@injectable()
export class YGOPRODECKCommand extends AutocompletableCommand {
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
			new SlashCommandStringOption().setRequired(true).setAutocomplete(true),
			() => c("command-option").t`term`,
			() => c("command-option-description").t`The English name of the card you're looking for.`
		);
		builder.addStringOption(option);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private async search(term: string): Promise<string | { name: string; data: number }[]> {
		const url = new URL("https://ygoprodeck.com/api/autocomplete.php");
		url.searchParams.set("query", term);
		const response = await (await fetch(url)).json();
		if ("error" in response) {
			return response.error;
		} else {
			return response.suggestions;
		}
	}

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const term = interaction.options.getFocused();
		const suggestions = await this.search(term);
		if (Array.isArray(suggestions)) {
			await interaction.respond(suggestions.map(({ name }) => ({ name, value: name })).slice(0, 25));
		}
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const term = interaction.options.getString("term", true);
		const lang = await this.locales.get(interaction);
		useLocale(lang);
		await interaction.reply(t`Searching YGOPRODECK for \`${term}\`…`);
		const response = await this.search(term);
		const result = Array.isArray(response)
			? `https://ygoprodeck.com/card/?search=${encodeURIComponent(response?.[0]?.data)}`
			: response;
		const reply = await interaction.editReply(result);
		return editLatency(reply, interaction);
	}
}
