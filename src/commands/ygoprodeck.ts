import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { AutocompletableCommand } from "../Command";
import { buildLocalisedCommand, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { editLatency, serialiseInteraction } from "../utils";

export type YGOPRODECKResponse = { error: string } | { suggestions: { name: string; data: number }[] };

@injectable()
export class YGOPRODECKCommand extends AutocompletableCommand {
	#logger = getLogger("command:ygoprodeck");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got
	) {
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

	private async search(term: string): Promise<YGOPRODECKResponse> {
		const url = new URL("https://ygoprodeck.com/api/autocomplete.php");
		url.searchParams.set("query", term);
		return await this.got(url).json<YGOPRODECKResponse>();
	}

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const term = interaction.options.getFocused();
		try {
			const start = Date.now();
			const response = await this.search(term);
			const latency = Date.now() - start;
			if ("suggestions" in response) {
				// Maximum 25 options https://discordjs.guide/slash-commands/autocomplete.html
				await interaction.respond(response.suggestions.map(({ name }) => ({ name, value: name })).slice(0, 25));
			}
			this.metrics.writeCommand(interaction, latency);
			this.#logger.info(serialiseInteraction(interaction, { autocomplete: term, latency, response }));
		} catch (error) {
			this.metrics.writeCommand(interaction, -1);
			this.#logger.warn(serialiseInteraction(interaction, { autocomplete: term }), error);
		}
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const term = interaction.options.getString("term", true);
		const lang = await this.locales.get(interaction);
		useLocale(lang);
		await interaction.reply(t`Searching YGOPRODECK for \`${term}\`…`);
		const response = await this.search(term);
		const result =
			"suggestions" in response
				? `https://ygoprodeck.com/card/?search=${encodeURIComponent(response.suggestions[0]?.data)}`
				: response.error;
		const reply = await interaction.editReply(result);
		return editLatency(reply, interaction);
	}
}
