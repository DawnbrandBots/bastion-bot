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
import { replyLatency, serialiseInteraction } from "../utils";

type YugipediaResponse = [string, string[], string[], string[]];

@injectable()
export class YugiCommand extends AutocompletableCommand {
	#logger = getLogger("command:yugi");

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
			() => c("command-name").t`yugipedia`,
			() => c("command-description").t`Search the Yugipedia wiki for a page and link to it.`
		);
		const option = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true).setAutocomplete(true),
			() => c("command-option").t`page`,
			() => c("command-option-description").t`The name of the Yugipedia page you want to search for.`
		);
		builder.addStringOption(option);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	// https://yugipedia.com/api.php?action=help&modules=opensearch
	// Match the main search box for the most part
	private static YUGI_SEARCH =
		"https://yugipedia.com/api.php?action=opensearch&format=json&formatversion=2&limit=25&suggest=true&search=";

	private async search(query: string): Promise<YugipediaResponse> {
		const url = YugiCommand.YUGI_SEARCH + encodeURIComponent(query);
		return await this.got(url, {
			headers: { Accept: "application/json" },
			throwHttpErrors: true
		}).json<YugipediaResponse>();
	}

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const page = interaction.options.getFocused();
		if (!page) {
			// Blank search querystring results in error nosearch from MediaWiki, so don't query.
			await interaction.respond([]);
			return;
		}
		try {
			const start = Date.now();
			const response = await this.search(page);
			const latency = Date.now() - start;
			this.#logger.info(serialiseInteraction(interaction, { autocomplete: page, latency, response }));
			// Slicing is a fail-safe because there shouldn't be more than the Discord limits to begin with
			await interaction.respond(response[1].map(name => ({ name, value: name })).slice(0, 25));
			this.metrics.writeCommand(interaction, latency);
		} catch (error) {
			this.#logger.warn(serialiseInteraction(interaction, { autocomplete: page }), error);
			this.metrics.writeCommand(interaction, -1);
		}
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const page = interaction.options.getString("page", true);
		const lang = await this.locales.get(interaction);
		let content;
		try {
			const response = await this.search(page);
			this.#logger.info(serialiseInteraction(interaction, { page, response }));
			useLocale(lang);
			const link = response[3][0];
			content = link || t`Could not find a Yugipedia page named \`${page}\`.`;
		} catch (error) {
			this.#logger.warn(serialiseInteraction(interaction, { page }), error);
			useLocale(lang);
			content = t`Something went wrong searching Yugipedia for \`${page}\`.`;
		}
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
