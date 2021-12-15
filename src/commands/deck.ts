import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { extractURLs, parseURL, TypedDeck } from "ydke";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

interface MultiCard {
	kid: number;
	password: number;
	name_en: string;
}

@injectable()
export class DeckCommand extends Command {
	#logger = getLogger("command:deck");

	constructor(@inject(Metrics) metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): ChatInputApplicationCommandData {
		return {
			name: "deck",
			description: "Display a deck list from ydke:// format, exported from a number of deck building programs.",
			options: [
				{
					type: "STRING",
					name: "deck",
					description: "The ydke:// URL of the deck you want to view.",
					required: true
				}
			]
		};
	}

	static override get aliases(): string[] {
		return [];
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	async generateProfile(deck: TypedDeck): Promise<MessageEmbed> {
		// get names from API
		const allUniqueNames = new Set([...deck.main, ...deck.extra, ...deck.side]);
		// TODO: decide if we're making a module for API interaction or using fetch directly in commands
		const cards: MultiCard[] = await (
			await fetch(`${process.env.OPENSEARCH_URL}/api/multi?${[...allUniqueNames].join(",")}`)
		).json();
		// we fetch the name before counting because doing this with an array is easier than a record
		// as such we memoise to avoid duplicate searches
		const nameMemo: Record<number, string> = {};
		const getName = (password: number): string => {
			if (!(password in nameMemo)) {
				const result = cards.filter(c => c.password === password);
				if (result.length > 0) {
					nameMemo[password] = result[0].name_en;
				} else {
					nameMemo[password] = password.toString();
				}
			}
			return nameMemo[password];
		};
		const namedDeck = {
			main: [...deck.main].map(getName),
			extra: [...deck.extra].map(getName),
			side: [...deck.side].map(getName)
		};
		// count the number of each card in the deck
		const count = (acc: Record<string, number>, val: string): Record<string, number> => {
			acc[val] = ++acc[val] || 1;
			return acc;
		};
		const deckCounts = {
			main: namedDeck.main.reduce(count, {}),
			extra: namedDeck.extra.reduce(count, {}),
			side: namedDeck.side.reduce(count, {})
		};
		// sum up the number of cards in each section for the headings
		// TODO: get monster/spell/trap counts
		const sum = (acc: number, cur: number) => acc + cur;
		const sums = {
			main: Object.values(deckCounts.main).reduce(sum, 0),
			extra: Object.values(deckCounts.extra).reduce(sum, 0),
			side: Object.values(deckCounts.side).reduce(sum, 0)
		};
		// print information into embed
		const printCount = (value: [string, number]): string => `${value[0]}: ${value[1]}`;
		const embed = new MessageEmbed();
		embed.setTitle("Your Deck");
		if (sums.main > 0) {
			const content = Object.entries(deckCounts.main).map(printCount).join("\n");
			embed.addField(`Main Deck (${sums.main} cards)`, content);
		}
		if (sums.extra > 0) {
			const content = Object.entries(deckCounts.extra).map(printCount).join("\n");
			embed.addField(`Extra Deck (${sums.extra} cards)`, content);
		}
		if (sums.side > 0) {
			const content = Object.entries(deckCounts.side).map(printCount).join("\n");
			embed.addField(`Side Deck (${sums.side} cards)`, content);
		}
		return embed;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		// NOTE: when we implement reading .ydk files, validate existence of headers/at least one populated section?
		const baseUrl = interaction.options.getString("deck", true);
		const urls = extractURLs(baseUrl);
		if (urls.length < 1) {
			await interaction.reply({
				content: "Error: Must provide a valid ydke:// URL!",
				ephemeral: true
			});
		} else {
			const deck = parseURL(urls[0]);
			const content = await this.generateProfile(deck);
			await interaction.reply({ embeds: [content], ephemeral: true }); // Actually returns void
		}
		const reply = await interaction.fetchReply();
		// return latency
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			return latency;
		} else {
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			return latency;
		}
	}
}
