import { rules } from "discord-markdown";
import { FormattingPatterns, Message } from "discord.js";
import { parserFor, ParserRules } from "simple-markdown";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { Listener } from ".";
import { createCardEmbed, getCard } from "../card";
import { Locale, LocaleProvider, LOCALES } from "../locale";
import { getLogger } from "../logger";
import { addFunding, addNotice } from "../utils";

// Only take certain plugins because we don't need to parse all markup like bolding
// and the mention parsing is not as well-maintained as discord.js
const ourRules = Object.fromEntries(
	[
		"escape", // type text, e.g. \`
		"blockQuote", // type blockQuote, > OR >>>
		"codeBlock", // type inlineCode, ```
		"inlineCode", // type inlineCode, `
		"spoiler", // type spoiler, ||
		"text"
	].map((label, order) => [label, { ...rules[label], order }])
) as ParserRules;
const parser = parserFor(ourRules);
// Can improve in future to do the entire processing with this parser to just grab the search tokens we want

// https://discord.com/developers/docs/reference#message-formatting-formats
const mentionPatterns = (
	["UserWithOptionalNickname", "Channel", "Role", "SlashCommand", "Emoji", "Timestamp"] as const
).map(key => new RegExp(FormattingPatterns[key], "g"));

export function cleanMessageMarkup(message: string): string {
	// Remove the above markup elements
	const nodes = parser(message, { inline: true });
	message = nodes
		.filter(node => node.type === "text")
		.map(node => node.content)
		.join("");
	for (const regex of mentionPatterns) {
		message = message.replaceAll(regex, "");
	}
	return message;
}

const DELIMITERS = {
	ANGLE: { match: /<([^<\n]+?)>/g, prune: /<<.*?>>/g },
	SQUARE: { match: /\[([^<\n]+?)\]/g, prune: /\[\[.*?\]\]/g },
	CC: { match: /=([^<\n]+?)=/g, prune: /==.*?==/g },
	TRANS: { match: /\)([^<\n]+?)\(/g, prune: null }, // ) (
	HAVEN: { match: /%([^<\n]+?)\^/g, prune: null } // % ^
} as const;

export function parseSummons(cleanMessage: string, regex: RegExp): string[] {
	return [...cleanMessage.matchAll(regex)]
		.map(match => match[1].trim())
		.filter(summon => {
			// Ignore matches containing only whitespace or containing the following three tokens
			if (summon.length === 0) {
				return false;
			}
			const lower = summon.toLowerCase();
			return !["://", "(", "anime"].some(token => lower.includes(token));
		});
}

export function preprocess(message: string): string[] {
	message = cleanMessageMarkup(message);
	message = message.replaceAll(DELIMITERS.ANGLE.prune, "");
	return parseSummons(message, DELIMITERS.ANGLE.match);
}

/**
 * Capture groups:
 * - kid: % sign, if this matches a Konami ID, optional
 * - number: matched sequence of digits
 * - lang: one of the locales,optional
 *
 * %4007
 * %4007,en
 *  % 4007  ,en
 * 00010000
 * 00010000,ja
 */
const NUMERIC_REGEX = new RegExp(
	/^(?<kid>%)?\s*(?<number>\d+)\s*(?:,(?<lang>LOCALES))?$/
		.toString()
		.slice(1, -1)
		.replace("LOCALES", LOCALES.join("|"))
);

/**
 * Capture groups:
 * - text: main body
 * - inputLang: one of the locales, optional
 * - resultLang: one of the locales, optional, if exists then inputLang exists
 *
 * blue-eyes
 * baguette,fr
 * blue-eyes,en,ja
 */
const TEXT_REGEX = new RegExp(
	/^(?<text>.*?)(?:,(?<inputLang>LOCALES))?(?:,(?<resultLang>))?$/
		.toString()
		.slice(1, -1)
		.replaceAll("LOCALES", LOCALES.join("|"))
);

@injectable()
export class SearchMessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message:search");

	constructor(@inject("LocaleProvider") private locales: LocaleProvider) {}

	async run(message: Message): Promise<void> {
		if (message.author.bot) {
			return;
		}
		let inputs = preprocess(message.content);
		if (inputs.length === 0) {
			return;
		}
		this.#logger.info(inputs);
		inputs = inputs.slice(0, 3);
		message.react("🕙").catch(this.#logger.warn);
		// metrics
		const language = await this.locales.getM(message);
		const promises = inputs
			.map(input => {
				let promise, resultLanguage;
				const matchNumeric = input.match(NUMERIC_REGEX);
				if (matchNumeric && matchNumeric.groups) {
					if (matchNumeric.groups.kid) {
						promise = getCard("konami-id", matchNumeric.groups.number);
					} else {
						promise = getCard("password", matchNumeric.groups.number);
					}
					if (matchNumeric.groups.lang) {
						resultLanguage = matchNumeric.groups.lang;
					} else {
						resultLanguage = language;
					}
				} else {
					const matchText = input.match(TEXT_REGEX);
					if (matchText && matchText.groups) {
						promise = getCard(
							"name",
							matchText.groups.text,
							(matchText.groups.inputLang as Locale | null) || language
						);
						resultLanguage = (matchText.groups.resultLang as Locale | null) || language;
					} else {
						// Should never happen
						throw new Error(input);
					}
				}
				return [input, resultLanguage as Locale, promise] as const;
			})
			.map(([input, resultLanguage, promise]) =>
				promise.then(card => {
					useLocale(resultLanguage);
					if (!card) {
						return message.reply({ content: t`Could not find a card matching \`${input}\`!` });
					} else {
						let embeds = createCardEmbed(card, resultLanguage);
						embeds = addFunding(addNotice(embeds));
						return message.reply({ embeds });
					}
				})
			);
		const replies = await Promise.allSettled(promises);
		for (const reply of replies) {
			if (reply.status === "fulfilled") {
				this.#logger.info(reply.value.createdTimestamp - message.createdTimestamp);
			} else {
				this.#logger.info(-1);
			}
		}
		message.reactions.cache.get("🕙")?.users.remove(message.client.user).catch(this.#logger.warn);
	}
}
