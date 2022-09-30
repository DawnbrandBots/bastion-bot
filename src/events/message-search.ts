import { rules } from "discord-markdown";
import { FormattingPatterns, Message } from "discord.js";
import { parserFor, ParserRules } from "simple-markdown";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { Listener } from ".";
import { ABDeploy } from "../abdeploy";
import { createCardEmbed, getCard } from "../card";
import { Locale, LocaleProvider, LOCALES } from "../locale";
import { getLogger } from "../logger";
import { RecentMessageCache } from "../message-cache";
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getDelimiter(message: Message) {
	switch (message.guildId) {
		case "170669983079071745":
			return DELIMITERS.CC;
		case "597478047163219988":
		case "845400480452050954":
			return DELIMITERS.SQUARE;
		case "871582695967301703":
			return DELIMITERS.HAVEN;
		case "780952232103116800":
			return DELIMITERS.TRANS;
		default:
			return DELIMITERS.ANGLE;
	}
}

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

export function preprocess(
	message: string,
	delimiter: typeof DELIMITERS[keyof typeof DELIMITERS] = DELIMITERS.ANGLE
): string[] {
	message = cleanMessageMarkup(message);
	if (delimiter.prune) {
		message = message.replaceAll(delimiter.prune, "");
	}
	return parseSummons(message, delimiter.match);
}

/**
 * Capture groups:
 * - kid: % sign, if this matches a Konami ID, optional
 * - number: matched sequence of digits
 * - lang: one of the locales,optional
 *
 * %4007
 * %4007,en
 * % 4007  ,en
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
	/^(?<text>.*?)(?:,(?<inputLang>LOCALES))?(?:,(?<resultLang>LOCALES))?$/
		.toString()
		.slice(1, -1)
		.replaceAll("LOCALES", LOCALES.join("|"))
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function inputToGetCardArguments(input: string, defaultLanguage: Locale) {
	let type, searchTerm, inputLanguage, resultLanguage;
	const matchNumeric = input.match(NUMERIC_REGEX);
	if (matchNumeric && matchNumeric.groups) {
		if (matchNumeric.groups.kid) {
			type = "konami-id" as const;
		} else {
			type = "password" as const;
		}
		searchTerm = matchNumeric.groups.number;
		if (matchNumeric.groups.lang) {
			resultLanguage = matchNumeric.groups.lang as Locale;
		} else {
			resultLanguage = defaultLanguage;
		}
	} else {
		const matchText = input.match(TEXT_REGEX);
		if (matchText && matchText.groups) {
			type = "name" as const;
			searchTerm = matchText.groups.text;
			inputLanguage = (matchText.groups.inputLang as Locale | null) || defaultLanguage;
			resultLanguage = (matchText.groups.resultLang as Locale | null) || defaultLanguage;
		} else {
			// Should never happen
			throw new Error(input);
		}
	}
	return [resultLanguage, type, searchTerm, inputLanguage] as const;
}

@injectable()
export class SearchMessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message:search");

	constructor(
		@inject("LocaleProvider") private locales: LocaleProvider,
		private recentCache: RecentMessageCache,
		private abdeploy: ABDeploy
	) {}

	async run(message: Message): Promise<void> {
		if (message.author.bot) {
			return;
		}
		// New functionality activated only in select servers
		if (!message.guildId || !this.abdeploy.has(message.guildId)) {
			return;
		}
		const delimiter = getDelimiter(message);
		let inputs = preprocess(message.content, delimiter);
		if (inputs.length === 0) {
			return;
		}
		this.#logger.info(inputs);
		inputs = inputs.slice(0, 3);
		message.react("🕙").catch(this.#logger.warn);
		// metrics
		const language = await this.locales.getM(message);
		const promises = inputs
			.map(input => [input, ...inputToGetCardArguments(input, language)] as const)
			.map(([input, resultLanguage, ...args]) =>
				getCard(...args).then(card => {
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
		const results = await Promise.allSettled(promises);
		const replies = [];
		for (const result of results) {
			if (result.status === "fulfilled") {
				const reply = result.value;
				this.#logger.info(reply.createdTimestamp - message.createdTimestamp);
				replies.push(reply.id);
			} else {
				this.#logger.info(-1);
			}
		}
		this.recentCache.set(message, replies);
		message.reactions.cache.get("🕙")?.users.remove(message.client.user).catch(this.#logger.warn);
	}
}
