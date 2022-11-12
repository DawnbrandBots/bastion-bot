import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction, escapeMarkdown } from "discord.js";
import { Got } from "got";
import { LRUMap, LRUMapWithDelete } from "mnemonist";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { AutocompletableCommand } from "../Command";
import { buildLocalisedCommand, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency, serialiseInteraction } from "../utils";

type YGOPRODECKResponse = { error: string } | { suggestions: { name: string; data: number }[] };

@injectable()
export class YGOPRODECKCommand extends AutocompletableCommand {
	#logger = getLogger("command:ygoprodeck");
	private httpCache = new LRUMapWithDelete<string, string>(10000);
	private suggestionCache = new LRUMap<string, number>(20000);

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
		return await this.got(url, {
			cache: this.httpCache,
			headers: { Accept: "application/json" }
		}).json<YGOPRODECKResponse>();
	}

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const term = interaction.options.getFocused();
		try {
			const start = Date.now();
			const response = await this.search(term);
			const latency = Date.now() - start;
			this.#logger.info(serialiseInteraction(interaction, { autocomplete: term, latency, response }));
			if ("suggestions" in response) {
				const options = [];
				for (const { name, data } of response.suggestions) {
					this.suggestionCache.set(name, data);
					options.push({ name, value: name });
				}
				// Maximum 25 options https://discordjs.guide/slash-commands/autocomplete.html
				await interaction.respond(options.slice(0, 25));
			} else {
				await interaction.respond([]);
			}
			this.metrics.writeCommand(interaction, latency);
		} catch (error) {
			this.#logger.warn(serialiseInteraction(interaction, { autocomplete: term }), error);
			this.metrics.writeCommand(interaction, -1);
		}
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const term = interaction.options.getString("term", true);
		let content;
		const cached = this.suggestionCache.get(term);
		if (cached) {
			content = `https://ygoprodeck.com/card/?search=${encodeURIComponent(cached)}`;
			this.#logger.info(serialiseInteraction(interaction, { term, cached }));
		} else {
			try {
				const start = Date.now();
				const response = await this.search(term);
				const latency = Date.now() - start;
				this.#logger.info(serialiseInteraction(interaction, { term, latency, response }));
				content =
					"suggestions" in response
						? `https://ygoprodeck.com/card/?search=${encodeURIComponent(response.suggestions[0]?.data)}`
						: response.error;
			} catch (error) {
				this.#logger.warn(serialiseInteraction(interaction, { term }), error);
				const lang = await this.locales.get(interaction);
				useLocale(lang);
				const searchTerm = escapeMarkdown(term);
				content = t`Something went wrong searching YGOPRODECK for \`${searchTerm}\`.`;
			}
		}
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
