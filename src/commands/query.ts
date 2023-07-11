import { SlashCommandBuilder } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, SlashCommandStringOption } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import { LocaleProvider, buildLocalisedCommand } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class QueryCommand extends Command {
	#logger = getLogger("command:query");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got
	) {
		super(metrics);
		this.got = got.extend({
			throwHttpErrors: true,
			timeout: 10000
		});
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`query`,
			() => c("command-description").t`Advanced search prototype`
		)
			.addStringOption(
				buildLocalisedCommand(
					new SlashCommandStringOption().setRequired(true),
					() => c("command-option").t`lucene`,
					() => c("command-option-description").t`Lucene query on YAML Yugi`
				)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const query = interaction.options.getString("lucene", true);
		await interaction.deferReply();
		const response = await this.got(`${process.env.API_URL}/ocg-tcg/query?q=${encodeURIComponent(query)}`);
		const cards: Static<typeof CardSchema>[] = JSON.parse(response.body);
		let content = `Total: ${cards.length}\n`;
		content += cards
			.slice(0, 10)
			.map(card => `1. ${card.name.en}`)
			.join("\n");
		await interaction.editReply({ content });
		return -2;
	}
}
