import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";
import { inject, injectable } from "tsyringe";
import { parseURL, TypedDeck } from "ydke";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import fetch from "../fetch";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { addNotice, replyLatency } from "../utils";

@injectable()
export class DeckCommand extends Command {
	#logger = getLogger("command:deck");

	constructor(@inject(Metrics) metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return {
			name: "deck",
			description: "Display a deck list from ydke:// format, exported from a number of deck building programs.",
			options: [
				{
					type: ApplicationCommandOptionTypes.STRING.valueOf(),
					name: "deck",
					description: "The ydke:// URL of the deck you want to view.",
					required: true
				},
				{
					type: ApplicationCommandOptionTypes.BOOLEAN.valueOf(),
					name: "public",
					description: "Whether to display the deck details publicly in chat. This is false by default.",
					required: false
				},
				{
					type: ApplicationCommandOptionTypes.BOOLEAN.valueOf(),
					name: "stacked",
					description:
						"Whether to display the deck sections as one stacked column. This is false (side-by-side) by default.",
					required: false
				}
			]
		};
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	splitText(outString: string, cap = 1024): string[] {
		const outStrings: string[] = [];
		while (outString.length > cap) {
			let index = outString.slice(0, cap).lastIndexOf("\n");
			if (index === -1 || index >= cap) {
				index = outString.slice(0, cap).lastIndexOf(".");
				if (index === -1 || index >= cap) {
					index = outString.slice(0, cap).lastIndexOf(" ");
					if (index === -1 || index >= cap) {
						index = cap - 1;
					}
				}
			}
			outStrings.push(outString.slice(0, index + 1));
			outString = outString.slice(index + 1);
		}
		outStrings.push(outString);
		return outStrings;
	}

	async generateProfile(deck: TypedDeck, isInline = true): Promise<MessageEmbed> {
		// use Set to remove duplicates from list of passwords to pass to API
		const allUniqueCards = [...new Set([...deck.main, ...deck.extra, ...deck.side])];
		// get names from API
		// TODO: decide if we're making a module for API interaction or using fetch directly in commands
		const cards: Static<typeof CardSchema>[] = await (
			await fetch(`${process.env.SEARCH_API}/multi?password=${allUniqueCards.join(",")}`)
		).json();
		// populate the names into a Map to be fetched linearly
		const cardMemo: Map<number, Static<typeof CardSchema>> = new Map<number, Static<typeof CardSchema>>();
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
			const [first, ...rest] = this.splitText(content);
			const headerParts = mainTypes.map(printTypeCount("main")).filter(t => !!t);
			embed.addField(
				`Main Deck (${sums.main} cards${headerParts.length > 0 ? ` - ${headerParts.join(", ")}` : ""})`,
				first,
				isInline
			);
			for (const part of rest) {
				embed.addField("Main Deck (continued)", part, isInline);
			}
		}
		if (sums.extra > 0) {
			const content = Object.entries(deckCounts.extra).map(printCount).join("\n");
			const [first, ...rest] = this.splitText(content);
			const headerParts = extraTypes.map(printTypeCount("extra")).filter(t => !!t);
			embed.addField(
				`Extra Deck (${sums.extra} cards${headerParts.length > 0 ? ` - ${headerParts.join(", ")}` : ""})`,
				first,
				isInline
			);
			for (const part of rest) {
				embed.addField("Extra Deck (continued)", part, isInline);
			}
		}
		if (sums.side > 0) {
			const content = Object.entries(deckCounts.side).map(printCount).join("\n");
			const [first, ...rest] = this.splitText(content);
			const headerParts = mainTypes.map(printTypeCount("side")).filter(t => !!t);
			embed.addField(
				`Side Deck (${sums.side} cards${headerParts.length > 0 ? ` - ${headerParts.join(", ")}` : ""})`,
				first,
				isInline
			);
			for (const part of rest) {
				embed.addField("Side Deck (continued)", part, isInline);
			}
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
			const reply = await interaction.reply({
				content: (e as Error).message,
				ephemeral: true,
				fetchReply: true
			});
			return replyLatency(reply, interaction);
		}
		// return error on empty deck
		if (deck.main.length + deck.extra.length + deck.side.length < 1) {
			const reply = await interaction.reply({
				content: `Error: Your deck is empty.`,
				ephemeral: true,
				fetchReply: true
			});
			return replyLatency(reply, interaction);
		}
		const isPublic = !!interaction.options.getBoolean("public", false);
		const isStacked = !!interaction.options.getBoolean("stacked", false);
		await interaction.deferReply({ ephemeral: !isPublic });
		const content = await this.generateProfile(deck, !isStacked);
		const end = Date.now();
		await interaction.editReply({ embeds: addNotice(content) });
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
