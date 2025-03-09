import { SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { AutocompleteInteraction, ChatInputCommandInteraction, escapeMarkdown } from "discord.js";
import { Got, TimeoutError } from "got";
import { LRUMap } from "mnemonist";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { ygoprodeckCard } from "../card";
import { AutocompletableCommand } from "../Command";
import { buildLocalisedCommand, everywhereCommand, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency, serialiseInteraction } from "../utils";

type YGOPRODECKResponse = { error: string } | { suggestions: { name: string; data: number }[] };

@injectable()
export class YGOPRODECKCommand extends AutocompletableCommand {
	#logger = getLogger("command:ygoprodeck");
	// Covers well beyond the total number of TCG and OCG cards
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
			everywhereCommand(),
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
			headers: { Accept: "application/json" }
		}).json<YGOPRODECKResponse>();
	}

	override async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
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
			content = ygoprodeckCard(cached);
			this.#logger.info(serialiseInteraction(interaction, { term, cached }));
		} else {
			const searchURL = `<https://ygoprodeck.com/card-database/?name=${encodeURIComponent(term)}>`;
			try {
				const start = Date.now();
				const response = await this.search(term);
				const latency = Date.now() - start;
				this.#logger.info(serialiseInteraction(interaction, { term, latency, response }));
				content =
					"suggestions" in response
						? ygoprodeckCard(response.suggestions[0]?.data)
						: `${response.error}\n${searchURL}`;
			} catch (error) {
				this.#logger.warn(serialiseInteraction(interaction, { term }), error);
				const lang = await this.locales.get(interaction);
				useLocale(lang);
				const searchTerm = escapeMarkdown(term);
				if (error instanceof TimeoutError) {
					content = t`Took too long [searching YGOPRODECK for \`${searchTerm}\`](${searchURL}). Is the site up?`;
				} else {
					content = t`Something went wrong [searching YGOPRODECK for \`${searchTerm}\`](${searchURL}). Is the site up?`;
				}
			}
		}
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
