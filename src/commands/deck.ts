import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbed } from "discord.js";
import { inject, injectable } from "tsyringe";
import { extractURLs, parseURL, TypedDeck } from "ydke";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class DeckCommand extends Command {
	#logger = getLogger("command:deck");

	constructor(@inject(Metrics) metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): ChatInputApplicationCommandData {
		return {
			name: "deck",
			description: "Display a summary of a given deck.",
			options: [
				{
					type: "STRING",
					name: "deck",
					description: "The YDKE URL of the deck you want to view.",
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

	generateProfile(deck: TypedDeck): MessageEmbed {
		// we fetch the name before counting because doing this with an array is easier than a record
		// as such we memoise to avoid duplicate calls
		const nameMemo: Record<number, string> = {};
		const getName = (passcode: number): string => {
			if (!(passcode in nameMemo)) {
				// TODO: implement fetching at least name from the API
				nameMemo[passcode] = passcode.toString();
			}
			return nameMemo[passcode];
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
			// TODO: write a human-readable error message, ideally explaining what and how a YDKE is.
			await interaction.reply({
				content: "YDKE Input Error",
				ephemeral: true
			});
		} else {
			const deck = parseURL(urls[0]);
			const content = this.generateProfile(deck);
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
