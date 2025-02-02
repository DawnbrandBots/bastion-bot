import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { Command } from "../Command";
import { createCardEmbed } from "../card";
import { CardSchema } from "../definitions";
import { UpdatingLimitRegulationVector } from "../limit-regulation";
import { LocaleProvider, buildLocalisedCommand, everywhereCommand, getResultLangStringOption } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { shouldExcludeIcons } from "../utils";

@injectable()
export class RandomCommand extends Command {
	#logger = getLogger("command:random");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got,
		@inject("limitRegulationMasterDuel") private masterDuelLimitRegulation: UpdatingLimitRegulationVector
	) {
		super(metrics);
		this.got = got.extend({
			throwHttpErrors: true,
			// Default got behaviour, with logging hooked in https://github.com/sindresorhus/got/tree/v11.8.6#retry
			retry: {
				limit: 2,
				// retry immediately, but pass through 0 values that cancel the retry
				calculateDelay: ({ attemptCount, error, computedValue }) => {
					this.#logger.info(`Retry ${attemptCount} (${computedValue} ms): `, error);
					return computedValue;
				}
			}
		});
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return buildLocalisedCommand(
			everywhereCommand(),
			() => c("command-name").t`random`,
			() => c("command-description").t`Get a random Yu-Gi-Oh! card.`
		)
			.addStringOption(getResultLangStringOption())
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		await interaction.deferReply();
		const url = `${process.env.API_URL}/ocg-tcg/random`;
		const cards = await this.got(url).json<Static<typeof CardSchema>[]>();
		const lang = await this.locales.get(interaction);
		const embeds = createCardEmbed(cards[0], lang, this.masterDuelLimitRegulation, shouldExcludeIcons(interaction));
		const end = Date.now();
		await interaction.editReply({ embeds }); // Actually returns void
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
