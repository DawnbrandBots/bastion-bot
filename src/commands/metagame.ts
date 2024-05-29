import {
	CacheType,
	ChatInputCommandInteraction,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandStringOption
} from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { Command } from "../Command";
import { buildLocalisedChoice, buildLocalisedCommand } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

interface TopResponse {
	archetypes: { arch_1: string; quantity: number; arch_1_img: number; archetypeTierPage: string }[];
	format: string;
	dateCutoffStart: string;
	dateCutoffEnd: string;
	tierMin: number;
	tierMax: number;
	total: number;
}

@injectable()
export class MetagameCommand extends Command {
	#logger = getLogger("command:metagame");

	constructor(
		metrics: Metrics,
		@inject("got") private got: Got
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`metagame`,
			() => c("command-description").t`Show the current tournament metagame.`
		);
		const option = buildLocalisedCommand(
			new SlashCommandStringOption()
				.addChoices([
					buildLocalisedChoice("TCG", () => "TCG"),
					buildLocalisedChoice("OCG", () => "OCG"),
					buildLocalisedChoice("OCG-AE", () => "OCG (Asian-English)")
				])
				.setRequired(true),
			() => c("command-option").t`region`,
			() => c("command-option-description").t`Game region.`
		);
		return builder.addStringOption(option).toJSON();
	}
	protected override get logger(): Logger {
		return this.#logger;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	private async getTops(region: string) {
		return await this.got
			.post("https://ygoprodeck.com/api/tournament/getTopArchetypes.php", {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/x-www-form-urlencoded"
				},
				body: `format=${region}`
			})
			.json<TopResponse>();
	}

	private link(path: string): URL {
		const url = new URL(`https://ygoprodeck.com${path}`);
		url.searchParams.set("utm_source", "bastion");
		return url;
	}

	protected override async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<number> {
		const region = interaction.options.getString("region", true);
		const tops = await this.getTops(region);
		let description = "";
		let otherQuantity = 0;
		for (const strategy of tops.archetypes) {
			if (strategy.quantity * 32 < tops.total) {
				otherQuantity += strategy.quantity;
			} else {
				description += `${((strategy.quantity / tops.total) * 100).toFixed(2)}% [${strategy.arch_1}](${this.link(strategy.archetypeTierPage)})\n`;
			}
		}
		description += `${((otherQuantity / tops.total) * 100).toFixed(2)}% Other`;
		const reply = await interaction.reply({
			embeds: [
				{
					title: `Top ${tops.format} strategies`,
					description,
					url: `https://ygoprodeck.com/tournaments/top-archetypes/?utm_source=bastion&format=${region}`, // deeplink pls
					footer: { text: `YGOPRODECK data ${tops.dateCutoffStart} to ${tops.dateCutoffEnd}` },
					thumbnail: {
						// render pie to raster pls
						url: `https://images.ygoprodeck.com/images/cards_cropped/${tops.archetypes[0]?.arch_1_img}.jpg`
					}
				}
			],
			fetchReply: true
		});
		return replyLatency(reply, interaction);
	}
}
