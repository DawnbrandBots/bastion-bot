import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { parseURL, TypedDeck } from "ydke";
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
				},
				{
					type: "BOOLEAN",
					name: "public",
					description: "Whether to display the deck details publicly in chat. This is false by default.",
					required: false
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
		// use Set to remove duplicates from list of passwords to pass to API
		const allUniqueCards = [...new Set([...deck.main, ...deck.extra, ...deck.side])];
		// get names from API
		// TODO: decide if we're making a module for API interaction or using fetch directly in commands
		const cards: MultiCard[] = await (
			await fetch(`${process.env.SEARCH_API}/multi?password=${allUniqueCards.join(",")}`)
		).json();
		// populate the names into a Map to be fetched linearly
		const nameMemo: Map<number, string> = new Map<number, string>();
		cards.forEach(c => {
			nameMemo.set(c.password, c.name_en);
		});
		// apply the names to the record of the deck
		// toString is fallback for missing name, though in reality we'd run into an issue in the API first?
		const getName = (password: number): string => nameMemo.get(password) || password.toString();
		const namedDeck = {
			main: [...deck.main].map(getName),
			extra: [...deck.extra].map(getName),
			side: [...deck.side].map(getName)
		};
		// count the number of each card in the deck
		const count = (acc: Record<string, number>, val: string): Record<string, number> => {
			acc[val] = acc[val] ? acc[val] + 1 : 1;
			return acc;
		};
		const deckCounts = {
			main: namedDeck.main.reduce(count, {}),
			extra: namedDeck.extra.reduce(count, {}),
			side: namedDeck.side.reduce(count, {})
		};
		// sum up the number of cards in each section for the headings
		// TODO: get monster/spell/trap counts
		const sum = (acc: number, cur: number): number => acc + cur;
		const sums = {
			main: Object.values(deckCounts.main).reduce(sum, 0),
			extra: Object.values(deckCounts.extra).reduce(sum, 0),
			side: Object.values(deckCounts.side).reduce(sum, 0)
		};
		// print information into embed
		const printCount = (value: [string, number]): string => `${value[1]} ${value[0]}`;
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
		let deck: TypedDeck;
		try {
			deck = parseURL(interaction.options.getString("deck", true));
		} catch (e) {
			// TODO: specifically catch error for bad input and respond more clearly?
			await interaction.reply({
				content: (e as Error).message,
				ephemeral: true
			});
			// placeholder latency
			return 0;
		}
		const isPublic = interaction.options.getBoolean("public", false) || false;
		const content = await this.generateProfile(deck);
		await interaction.reply({ embeds: [content], ephemeral: !isPublic }); // Actually returns void

		// placeholder latency value
		return 0;
		// TODO: update latency calculation since we can't fetch ephemeral replies
		/*const reply = await interaction.fetchReply();
		// return latency
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			return latency;
		} else {
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			return latency;
		}*/
	}
}
