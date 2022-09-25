import { rules } from "discord-markdown";
import { FormattingPatterns, Message } from "discord.js";
import { parserFor, ParserRules } from "simple-markdown";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { Listener } from ".";
import { createCardEmbed, getCard } from "../card";
import { LocaleProvider } from "../locale";
import { getLogger } from "../logger";
import { addFunding, addNotice } from "../utils";

// Only take certain plugins because we don't need to parse all markup like bolding
// and the mention parsing is not as well-maintained as discord.js
const parser = parserFor({
	blockQuote: rules.blockQuote, // type blockQuote, > OR >>>
	codeBlock: rules.codeBlock, // type inlineCode, ```
	escape: rules.escape, // type text, e.g. \`
	inlineCode: rules.inlineCode, // type inlineCode, `
	spoiler: rules.spoiler, // type spoiler, ||
	text: rules.text
} as ParserRules);
// Can improve in future to do the entire processing with this parser to just grab the search tokens we want

// https://discord.com/developers/docs/reference#message-formatting-formats
const mentionPatterns = (
	["UserWithOptionalNickname", "Channel", "Role", "SlashCommand", "Emoji", "Timestamp"] as const
).map(key => new RegExp(FormattingPatterns[key], "g"));

function cleanMessageMarkup(message: string): string {
	// Remove the above markup elements
	const nodes = parser(message);
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

function parseSummons(cleanMessage: string, regex: RegExp): string[] {
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

function preprocess(message: string): string[] {
	message = cleanMessageMarkup(message);
	message = message.replaceAll(DELIMITERS.ANGLE.prune, "");
	return parseSummons(message, DELIMITERS.ANGLE.match);
}

@injectable()
export class SearchMessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message:search");

	constructor(@inject("LocaleProvider") private locales: LocaleProvider) {}

	async run(message: Message): Promise<void> {
		if (message.author.bot) {
			return;
		}
		const inputs = preprocess(message.content);
		if (inputs.length === 0) {
			return;
		}
		// upper limit of 3
		this.#logger.info(inputs);
		const language = await this.locales.getM(message);
		// metrics
		// add reaction
		const promises = inputs
			.map(input => {
				const password = Number(input);
				const kid = Number(input.slice(1));
				let promise;
				if (input.startsWith("%") && Number.isSafeInteger(kid)) {
					promise = getCard("konami-id", `${kid}`);
				} else if (Number.isSafeInteger(password)) {
					promise = getCard("password", `${password}`);
				} else {
					promise = getCard("name", input, language);
				}
				return [input, promise] as const;
			})
			.map(([input, promise]) =>
				promise.then(card => {
					useLocale(language);
					if (!card) {
						return message.reply({ content: t`Could not find a card matching \`${input}\`!` });
					} else {
						let embeds = createCardEmbed(card, language);
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
		// remove reaction
	}
}
