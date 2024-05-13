import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { Command } from "../Command";
import { LocaleProvider, buildLocalisedCommand } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency, serialiseInteraction } from "../utils";

@injectable()
export class DeckSearchCommand extends Command {
	#logger = getLogger("command:deck-search");
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
			() => c("command-name").t`deck-search`,
			() => c("command-description").t`Search YGOPRODECK for decks.`
		);
		const cardSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`card`,
			() => c("command-option-description").t`Search YGOPRODECK for a deck containing this card.`
		);
		const strategySubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`strategy`,
			() => c("command-option-description").t`Search YGOPRODECK for a deck using this strategy.`
		);
		const option = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`term`,
			() => c("command-option-description").t`Search term.`
		);
		cardSubcommand.addStringOption(option);
		strategySubcommand.addStringOption(option);
		builder.addSubcommand(cardSubcommand).addSubcommand(strategySubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private async getDecks(params: Record<string, string>) {
		const url = new URL("https://ygoprodeck.com/api/decks/getDecks.php");
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		return await this.got(url, { headers: { Accept: "application/json" } });
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const subcommand = interaction.options.getSubcommand(true);
		const term = interaction.options.getString("term", true);
		this.#logger.info(serialiseInteraction(interaction, { term, subcommand }));
		const params: Record<string, string> =
			subcommand === "card"
				? { tournament: "tier-2", limit: "10", cardcode: term }
				: { tournament: "tier-2", limit: "10", _sft_post_tag: term };
		const response = await this.getDecks(params);
        const decks: any[] = JSON.parse(response.body);
		let content = decks
			.slice(0, 10)
			.map(
				deck =>
					`[${deck.tournamentPlayerName}'s ${deck.deck_excerpt}](<https://ygoprodeck.com/deck/${deck.deckNum}?utm_source=bastion>) ${deck.submit_date}\n`
			)
			.join("");
        content += `[More results](<https://ygoprodeck.com/deck-search/?utm_source=bastion#${new URL(response.requestUrl).search.slice(1)}>)`;
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
