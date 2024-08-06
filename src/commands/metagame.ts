import {
	APIEmbed,
	ChatInputCommandInteraction,
	EmbedBuilder,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder
} from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c } from "ttag";
import { Command } from "../Command";
import { buildLocalisedChoice, buildLocalisedCommand } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

export interface TopStrategiesResponse {
	archetypes: { arch_1: string; quantity: number; arch_1_img: number; archetypeTierPage: string }[];
	format: string;
	dateCutoffStart: string;
	dateCutoffEnd: string;
	tierMin: number;
	tierMax: number;
	total: number;
}

export type TopCardsFormat =
	| "Tournament Meta Decks"
	| "Tournament Meta Decks OCG"
	| "Tournament Meta Decks OCG (Asian-English)"
	| "Master Duel Decks";
// https://ygoprodeck.com/top/ uses 90 for 3 months, 182 for 6 months
export type TopCardsDateStart = "format" | "banlist" | `${number} day`;

export interface TopCardsResponse {
	keys: {
		format: TopCardsFormat;
		dateStart: string;
		dateEnd: string;
	};
	results: {
		name: string;
		card_number: number;
		pretty_url: string;
		total_card_count: `${number}`;
		deck_count: number;
		avg_card_per_deck: `${number}`;
		percentage: `${number}`;
		percent_played_at_1: `${number}`;
		percent_played_at_2: `${number}`;
		percent_played_at_3: `${number}`;
	}[];
}

export interface MasterDuelCardUsage {
	name: string;
	id: number;
	win_count: number;
	loss_count: number;
	win_ratio: number;
	duel_count: number;
	placement: number;
	season: number;
	game_mode: string;
	pretty_url: string;
	rarity: string;
}

export interface MasterDuelTier {
	tier: number;
	season: number;
	game_mode: string;
	archetype_name: string;
	win_count: number;
	loss_count: number;
	win_ratio: string;
	duel_count: number;
	rank_weighted_score: number;
	average_turn_count: string;
	median_turn_count: string;
}

@injectable()
export class MetagameClient {
	constructor(@inject("got") private got: Got) {
		this.got = got.extend({ throwHttpErrors: true });
	}

	async getTops(region: string): Promise<TopStrategiesResponse> {
		return await this.got
			.post("https://ygoprodeck.com/api/tournament/getTopArchetypes.php", {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/x-www-form-urlencoded"
				},
				body: `format=${region}`
			})
			.json();
	}

	async getCardUsage(format: TopCardsFormat, dateStart: TopCardsDateStart): Promise<TopCardsResponse> {
		const url = new URL("https://ygoprodeck.com/api/top/getFormat.php");
		url.searchParams.set("format", format); // required
		url.searchParams.set("dateStart", dateStart); // can be omitted to retrieve all-time statistics
		return await this.got(url).json();
	}

	async getMasterDuelCardUsage(): Promise<MasterDuelCardUsage[]> {
		return await this.got("https://ygoprodeck.com/api/master-duel/card-usage.php").json();
	}

	async getMasterDuelTierList(): Promise<MasterDuelTier[]> {
		return await this.got("https://ygoprodeck.com/api/master-duel/tier-list.php").json();
	}
}

const mapTopCardsFormatToTitle: Record<TopCardsFormat, string> = {
	"Tournament Meta Decks": "Top TCG cards",
	"Tournament Meta Decks OCG": "Top OCG cards",
	"Tournament Meta Decks OCG (Asian-English)": "Top OCG-AE cards",
	"Master Duel Decks": "Top Master Duel cards"
};

function link(path: string): URL {
	const url = new URL(`https://ygoprodeck.com${path}`);
	url.searchParams.set("utm_source", "bastion");
	return url;
}

export function createTopStrategiesEmbed(tops: TopStrategiesResponse): APIEmbed {
	let description = "";
	let otherQuantity = 0;
	for (const strategy of tops.archetypes) {
		if (strategy.quantity * 32 < tops.total) {
			otherQuantity += strategy.quantity;
		} else {
			description += `${((strategy.quantity / tops.total) * 100).toFixed(2)}% [${strategy.arch_1}](${link(strategy.archetypeTierPage)})\n`;
		}
	}
	description += `${((otherQuantity / tops.total) * 100).toFixed(2)}% Other`;
	return {
		title: `Top ${tops.format} strategies`,
		description,
		url: `https://ygoprodeck.com/tournaments/top-archetypes/?utm_source=bastion#${tops.format}/All/Format/NA/`,
		footer: { text: `YGOPRODECK data ${tops.dateCutoffStart} to ${tops.dateCutoffEnd}` },
		image: {
			url: `https://dawnbrandbots.github.io/ygoprodeck-e2e-test/top-chart-${tops.format.toLowerCase()}.png`
		}
	};
}

export function createCardUsageEmbed(usage: TopCardsResponse): EmbedBuilder {
	return (
		new EmbedBuilder()
			.setTitle(mapTopCardsFormatToTitle[usage.keys.format] ?? `Top ${usage.keys.format} cards`)
			// TODO: no deeplink
			.setURL("https://ygoprodeck.com/top/?utm_source=bastion")
			.setFields(
				usage.results.slice(0, 10).map(card => ({
					name: card.name,
					value: `${card.percentage}% of decks, average copies: ${card.avg_card_per_deck}`
				}))
			)
			.setFooter({ text: `YGOPRODECK data ${usage.keys.dateStart} to ${usage.keys.dateEnd}` })
	);
}

@injectable()
export class MetagameCommand extends Command {
	#logger = getLogger("command:metagame");

	constructor(
		metrics: Metrics,
		private api: MetagameClient
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`metagame`,
			() => c("command-description").t`Show statistics on the current competitive state of play.`
		);
		const strategiesSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`strategies`,
			() =>
				process.env.BOT_NO_DIRECT_MESSAGE_SEARCH
					? c("command-option-description")
							.t`Show the top competitive strategies in tournaments and the Master Duel ranked ladder.`
					: c("command-option-description").t`Show the top competitive strategies in tournaments.`
		).addStringOption(
			buildLocalisedCommand(
				new SlashCommandStringOption()
					.addChoices([
						buildLocalisedChoice("TCG", () => c("command-option-choice").t`TCG`),
						buildLocalisedChoice("OCG", () => c("command-option-choice").t`OCG`),
						buildLocalisedChoice("OCG-AE", () => c("command-option-choice").t`OCG (Asian-English)`)
					])
					.addChoices(
						process.env.BOT_NO_DIRECT_MESSAGE_SEARCH
							? [
									buildLocalisedChoice(
										"MD-TL",
										() => c("command-option-choice").t`Master Duel Diamond+ tier list`
									)
								]
							: []
					)
					.setRequired(true),
				() => c("command-option").t`format`,
				() => c("command-option-description").t`Game region.`
			)
		);
		const cardsSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`cards`,
			() =>
				c("command-option-description")
					.t`Show the most popular cards in tournaments and the Master Duel ranked ladder.`
		)
			.addStringOption(
				buildLocalisedCommand(
					new SlashCommandStringOption()
						.addChoices([
							buildLocalisedChoice<TopCardsFormat>(
								"Tournament Meta Decks",
								() => c("command-option-choice").t`TCG`
							),
							buildLocalisedChoice<TopCardsFormat>(
								"Tournament Meta Decks OCG",
								() => c("command-option-choice").t`OCG`
							),
							buildLocalisedChoice<TopCardsFormat>(
								"Tournament Meta Decks OCG (Asian-English)",
								() => c("command-option-choice").t`OCG (Asian-English)`
							),
							buildLocalisedChoice("MD", () => c("command-option-choice").t`Master Duel ranked ladder`)
						])
						.addChoices(
							process.env.BOT_NO_DIRECT_MESSAGE_SEARCH
								? [
										buildLocalisedChoice<TopCardsFormat>(
											"Master Duel Decks",
											() => "Master Duel Decks from common API (unclear differentiator)"
										)
									]
								: []
						)
						.setRequired(true),
					() => c("command-option").t`format`,
					() => c("command-option-description").t`Game region.`
				)
			)
			.addStringOption(
				buildLocalisedCommand(
					new SlashCommandStringOption().addChoices([
						buildLocalisedChoice<TopCardsDateStart>(
							"format",
							() => c("command-option-choice").t`Current format`
						),
						buildLocalisedChoice<TopCardsDateStart>(
							"banlist",
							() => c("command-option-choice").t`Since last Forbidden/Limited List`
						),
						buildLocalisedChoice<TopCardsDateStart>(
							"7 day",
							() => c("command-option-choice").t`Last 7 days`
						),
						buildLocalisedChoice<TopCardsDateStart>(
							"14 day",
							() => c("command-option-choice").t`Last 14 days`
						),
						buildLocalisedChoice<TopCardsDateStart>(
							"30 day",
							() => c("command-option-choice").t`Last 30 days`
						),
						buildLocalisedChoice<TopCardsDateStart>(
							"90 day",
							() => c("command-option-choice").t`Last three months`
						),
						buildLocalisedChoice<TopCardsDateStart>(
							"182 day",
							() => c("command-option-choice").t`Last six months`
						)
					]),
					() => c("command-option").t`date-range`,
					() =>
						c("command-option-description")
							.t`Limit card usage statistics to this date range. Has no effect for Master Duel.`
				)
			);
		builder.addSubcommand(strategiesSubcommand).addSubcommand(cardsSubcommand);
		return builder.toJSON();
	}
	protected override get logger(): Logger {
		return this.#logger;
	}

	private async masterDuelCardUsage(interaction: ChatInputCommandInteraction): Promise<number> {
		const usage = await this.api.getMasterDuelCardUsage();
		const reply = await interaction.reply({
			embeds: [
				{
					title: "Master Duel Diamond+ ranked card usage",
					url: "https://ygoprodeck.com/master-duel/card-usage/?utm_source=bastion",
					fields: usage.map(card => ({
						name: card.name,
						value: `${(card.win_ratio * 100).toFixed(2)}% wins in ${card.duel_count} duels`
					})),
					footer: { text: `YGOPRODECK data for season ${usage[0].season}` }
				}
			],
			fetchReply: true
		});
		return replyLatency(reply, interaction);
	}

	private async masterDuelTierList(interaction: ChatInputCommandInteraction): Promise<number> {
		const tierList = await this.api.getMasterDuelTierList();
		const tiers = new Map<number, MasterDuelTier[]>();
		for (const strategy of tierList) {
			if (!tiers.has(strategy.tier)) {
				tiers.set(strategy.tier, []);
			}
			tiers.get(strategy.tier)!.push(strategy);
		}
		const reply = await interaction.reply({
			embeds: [
				{
					title: "Master Duel Diamond+ tier list",
					url: "https://ygoprodeck.com/master-duel/tier-list/?utm_source=bastion",
					fields: [...tiers.entries()].map(([tier, strategies]) => ({
						name: `Tier ${tier}`,
						value: strategies
							.map(
								strategy =>
									`- ${strategy.archetype_name} WR: ${strategy.win_ratio} (WS: ${strategy.rank_weighted_score})\n`
							)
							.join("")
					})),
					footer: {
						text: `YGOPRODECK weighted scores for season ${tierList[0].season}.\nMean turns: ${tierList[0].average_turn_count}. Median turns: ${tierList[0].median_turn_count}`
					}
				}
			],
			fetchReply: true
		});
		return replyLatency(reply, interaction);
	}

	private async tournamentTops(interaction: ChatInputCommandInteraction, region: string): Promise<number> {
		const tops = await this.api.getTops(region);
		const embed = createTopStrategiesEmbed(tops);
		const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
		return replyLatency(reply, interaction);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		if (interaction.options.getSubcommand() === "strategies") {
			const format = interaction.options.getString("format", true);
			if (format === "MD-TL") {
				// Option only available in preview
				return await this.masterDuelTierList(interaction);
			} else {
				return await this.tournamentTops(interaction, format);
			}
		} else {
			// subcommand cards
			const format = interaction.options.getString("format", true);
			if (format === "MD") {
				// Option only available in preview
				return await this.masterDuelCardUsage(interaction);
			} else {
				const dateStart = interaction.options.getString("date-range") ?? "format";
				const usage = await this.api.getCardUsage(format as TopCardsFormat, dateStart as TopCardsDateStart);
				const embed = createCardUsageEmbed(usage);
				const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
				return replyLatency(reply, interaction);
			}
		}
	}
}
