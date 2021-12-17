import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { parseURL, TypedDeck } from "ydke";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

interface APICard {
	kid: number;
	password: number;
	en: { name: string };
	type: string; // Main Deck Category
	subtype: string; // Extra Deck Category (for our purposes)
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
				},
				{
					type: "BOOLEAN",
					name: "stacked",
					description:
						"Whether to display the Main, Side and Extra deck as one stacked column instead of side-by-side. This is false by default.",
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

	async generateProfile(deck: TypedDeck, isInline: boolean = true): Promise<MessageEmbed> {
		// use Set to remove duplicates from list of passwords to pass to API
		const allUniqueCards = [...new Set([...deck.main, ...deck.extra, ...deck.side])];
		// get names from API
		// TODO: decide if we're making a module for API interaction or using fetch directly in commands
		const cards: APICard[] = await (
			await fetch(`${process.env.SEARCH_API}/multi?password=${allUniqueCards.join(",")}`)
		).json();
		// populate the names into a Map to be fetched linearly
		const cardMemo: Map<number, APICard> = new Map<number, APICard>();
		cards.forEach(c => {
			// in case an API error returns a null response for a card, we don't record its name and a fallback will be triggered later
			if (c) {
				cardMemo.set(c.password, c);
			}
		});
		// apply the names to the record of the deck
		// toString is fallback for missing name, e.g. if an API error returns null
		const getName = (password: number): string => cardMemo.get(password)?.en.name || password.toString();
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
		// we do this seperately from the some of the below to not assume a card fits in exactly one of the given categories
		const sum = (acc: number, cur: number): number => acc + cur;
		const sums = {
			main: Object.values(deckCounts.main).reduce(sum, 0),
			extra: Object.values(deckCounts.extra).reduce(sum, 0),
			side: Object.values(deckCounts.side).reduce(sum, 0)
		};
		// count the number of each meaningful card type in the deck
		const typeCount =
			(types: string[], field: "type" | "subtype") => (acc: Record<string, number>, val: number) => {
				const card = cardMemo.get(val);
				if (card) {
					for (const type of types) {
						if (card[field] === type) {
							acc[type] = acc[type] ? acc[type] + 1 : 1;
						}
					}
				}
				return acc;
			};
		const mainTypes = ["Monster", "Spell", "Trap"];
		const extraTypes = ["Fusion", "Synchro", "Xyz", "Link"];
		const typeCounts = {
			main: [...deck.main].reduce(typeCount(mainTypes, "type"), {}),
			extra: [...deck.extra].reduce(typeCount(extraTypes, "subtype"), {}),
			side: [...deck.side].reduce(typeCount(mainTypes, "type"), {})
		};
		// print information into embed
		const printCount = (value: [string, number]): string => `${value[1]} ${value[0]}`;
		const plurals: Record<string, string> = {
			Monster: "Monsters",
			Spell: "Spells",
			Trap: "Traps",
			Fusion: "Fusions",
			Synchro: "Synchros",
			Xyz: "Xyz",
			Link: "Links"
		};
		const printTypeCount =
			(field: "main" | "extra" | "side") =>
			(type: string): string | undefined => {
				const count = typeCounts[field][type];
				if (count > 0) {
					return `${count} ${count > 1 ? plurals[type] : type}`;
				}
			};
		const embed = new MessageEmbed();
		embed.setTitle("Your Deck");
		if (sums.main > 0) {
			const content = Object.entries(deckCounts.main).map(printCount).join("\n");
			const headerParts = mainTypes.map(printTypeCount("main")).filter(t => !!t);
			embed.addField(
				`Main Deck (${sums.main} cards${headerParts.length > 0 ? ` - ${headerParts.join(", ")}` : ""})`,
				content,
				isInline
			);
		}
		if (sums.extra > 0) {
			const content = Object.entries(deckCounts.extra).map(printCount).join("\n");
			const headerParts = extraTypes.map(printTypeCount("extra")).filter(t => !!t);
			embed.addField(
				`Extra Deck (${sums.extra} cards${headerParts.length > 0 ? ` - ${headerParts.join(", ")}` : ""})`,
				content,
				isInline
			);
		}
		if (sums.side > 0) {
			const content = Object.entries(deckCounts.side).map(printCount).join("\n");
			const headerParts = mainTypes.map(printTypeCount("side")).filter(t => !!t);
			embed.addField(
				`Side Deck (${sums.side} cards${headerParts.length > 0 ? ` - ${headerParts.join(", ")}` : ""})`,
				content,
				isInline
			);
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
		const isPublic = !!interaction.options.getBoolean("public", false);
		const isStacked = !!interaction.options.getBoolean("stacked", false);
		const content = await this.generateProfile(deck, !isStacked);
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
