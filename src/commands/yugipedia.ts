import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { LRUMap } from "mnemonist";
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
	// Covers well beyond the total number of TCG and OCG cards, though Yugipedia has many more pages
	private linkCache = new LRUMap<string, string>(20000);

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
			// Autocomplete disabled: https://github.com/DawnbrandBots/bastion-bot/issues/293
			new SlashCommandStringOption().setRequired(true).setAutocomplete(false),
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

	override async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
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
			const options = [];
			for (let i = 0; i < response[1].length; i++) {
				const name = response[1][i];
				const url = response[3][i];
				this.linkCache.set(name, url);
				options.push({ name, value: name });
			}
			// Slicing is a fail-safe because there shouldn't be more than the Discord limits to begin with
			await interaction.respond(options.slice(0, 25));
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
		const cached = this.linkCache.get(page);
		if (cached) {
			content = cached;
			this.#logger.info(serialiseInteraction(interaction, { page, cached }));
		} else {
			try {
				const start = Date.now();
				const response = await this.search(page);
				const latency = Date.now() - start;
				this.#logger.info(serialiseInteraction(interaction, { page, latency, response }));
				useLocale(lang);
				const link = response[3][0];
				content = link || t`Could not find a Yugipedia page named \`${page}\`.`;
			} catch (error) {
				// Level dropped from warn to info: https://github.com/DawnbrandBots/bastion-bot/issues/293
				this.#logger.info(serialiseInteraction(interaction, { page }), error);
				useLocale(lang);
				content = t`Something went wrong searching Yugipedia for \`${page}\`.`;
				content += "\nhttps://twitter.com/Yugipedia/status/1632192728267395072";
			}
		}
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
