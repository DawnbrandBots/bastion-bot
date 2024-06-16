import { Static } from "@sinclair/typebox";
import { rules } from "discord-markdown";
import {
	Colors,
	DiscordAPIError,
	EmbedBuilder,
	EmojiIdentifierResolvable,
	FormattingPatterns,
	Message,
	MessageReaction,
	MessageReplyOptions,
	PermissionsBitField,
	RESTJSONErrorCodes
} from "discord.js";
import { Got } from "got";
import { OrderedSet, Seq, ValueObject } from "immutable";
import { ParserRules, parserFor } from "simple-markdown";
import { inject, injectable, instanceCachingFactory } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Listener } from ".";
import { ABDeploy } from "../abdeploy";
import { createCardEmbed, getCard } from "../card";
import { CardSchema } from "../definitions";
import { RushCardSchema } from "../definitions/rush";
import { EventLocker } from "../event-lock";
import { UpdatingLimitRegulationVector } from "../limit-regulation";
import { LOCALES, LOCALES_MAP, Locale, LocaleProvider } from "../locale";
import { Logger, getLogger } from "../logger";
import { RecentMessageCache } from "../message-cache";
import { Metrics } from "../metrics";
import { createRushCardEmbed, getRushCardByKonamiId, searchRushCard } from "../rush-duel";
import { shouldIgnore } from "../utils";

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
).map(key => new RegExp(FormattingPatterns[key], `${FormattingPatterns[key].flags}g`));

const undocumentedPatterns = [
	"<id:browse>", // "Browse Channels"
	"<id:customize>", // "Customise Community"
	"<id:home>", // links to community rules channel
	"<id:guide>" // "Server Guide"
];

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
	for (const string of undocumentedPatterns) {
		message = message.replaceAll(string, "");
	}
	return message;
}

const DELIMITERS = {
	ANGLE: { match: /<([^<\n]+?)>/g, prune: /<<.*?>>/g },
	SQUARE: { match: /\[([^<\n]+?)\]/g, prune: /\[\[.*?\]\]/g },
	CC: { match: /=([^<\n]+?)=/g, prune: /==.*?==/g },
	HAVEN: { match: /%([^<\n]+?)\^/g, prune: null } // % ^
} as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getDelimiter(message: Message) {
	switch (message.guildId) {
		case "170669983079071745":
			return DELIMITERS.CC;
		case "597478047163219988":
			return DELIMITERS.SQUARE;
		case "871582695967301703":
			return DELIMITERS.HAVEN;
		default:
			return DELIMITERS.ANGLE;
	}
}

class SearchSummon implements ValueObject {
	readonly summon: string;
	readonly type: "ocg" | "rush";
	readonly original: string;
	readonly index: number;

	constructor(match: RegExpExecArray) {
		this.summon = match[1].trim();
		const beforePosition = match.index - 1;
		const afterPosition = match.index + match[1].length + 2;
		const before = match.input[beforePosition];
		const after = match.input[afterPosition];
		if (before?.toLowerCase() === "r" || after?.toLowerCase() === "r" || before === "러" || after === "러") {
			this.type = "rush";
		} else {
			this.type = "ocg";
		}
		this.original = match.input.substring(beforePosition, afterPosition + 1);
		this.index = match.index;
	}

	shouldIgnore(): boolean {
		if (this.summon.length === 0 || this.summon.length > 80) {
			return true;
		}
		const lower = this.summon.toLowerCase();
		// Ignore, let old bot process
		return ["://", "(", "anime"].some(token => lower.includes(token));
	}

	equals(other: unknown): boolean {
		if (other instanceof SearchSummon) {
			return this.summon === other.summon && this.type === other.type;
		}
		return false;
	}

	hashCode(): number {
		return Seq({ summon: this.summon, type: this.type }).hashCode();
	}
}

function parseSummons(cleanMessage: string, regex: RegExp): SearchSummon[] {
	return [...cleanMessage.matchAll(regex)]
		.map(match => new SearchSummon(match))
		.filter(summon => !summon.shouldIgnore());
}

export function preprocess(
	message: string,
	delimiter: (typeof DELIMITERS)[keyof typeof DELIMITERS] = DELIMITERS.ANGLE
): SearchSummon[] {
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
	/^(?<kid>%)?\s*(?<number>\d{4,})\s*(?:,(?<lang>LOCALES))?$/
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
		return [resultLanguage, type, searchTerm, inputLanguage] as const;
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
		return [resultLanguage, type, searchTerm, inputLanguage] as const;
	}
}

interface CardSearcher {
	search(
		message: Message,
		input: string,
		language: Locale
	): Promise<[Static<typeof CardSchema | typeof RushCardSchema> | null | undefined, MessageReplyOptions]>;
}

class OCGCardSearcher implements CardSearcher {
	constructor(
		private got: Got,
		private masterDuelLimitRegulation: UpdatingLimitRegulationVector
	) {}
	async search(message: Message, input: string, language: Locale): ReturnType<CardSearcher["search"]> {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments(input, language);
		const card = await getCard(this.got, type, searchTerm, inputLanguage);
		useLocale(resultLanguage);
		let replyOptions;
		if (!card) {
			let context = "\n";
			if (type === "name") {
				const localisedInputLanguage = LOCALES_MAP.get(inputLanguage);
				// Note: nonfunctional in development or preview because those bots do not have global commands.
				// To test functionality in development or preview, fetch guild commands and search them instead.
				const id = message.client.application.commands.cache.find(cmd => cmd.name === "locale")?.id ?? 0;
				context += t`Search language: **${localisedInputLanguage}** (${inputLanguage}). Check defaults with </locale get:${id}> and configure with </locale set:${id}>`;
			} else {
				const localisedType = rc("command-option").gettext(type);
				context += t`Search type: ${localisedType}`;
			}
			replyOptions = { content: t`Could not find a card matching \`${input}\`!` + context };
		} else {
			const embeds = createCardEmbed(card, resultLanguage, this.masterDuelLimitRegulation);
			// eslint-disable-next-line no-constant-condition
			if (false) {
				embeds[embeds.length - 1].addFields({
					name: t`💬 Translations missing?`,
					value: t`Help translate Bastion at the links above.`
				});
			}
			replyOptions = { embeds };
		}
		return [card, replyOptions];
	}
}

class RushCardSearcher implements CardSearcher {
	constructor(
		private got: Got,
		private limitRegulation: UpdatingLimitRegulationVector
	) {}
	async search(message: Message, input: string, language: Locale): ReturnType<CardSearcher["search"]> {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments(input, language);
		const card =
			type === "name"
				? (await searchRushCard(this.got, searchTerm, inputLanguage))[0]
				: await getRushCardByKonamiId(this.got, searchTerm);
		useLocale(resultLanguage);
		let replyOptions;
		if (!card) {
			let context = "\n";
			if (type === "name") {
				const localisedInputLanguage = LOCALES_MAP.get(inputLanguage);
				// Note: nonfunctional in development or preview because those bots do not have global commands.
				// To test functionality in development or preview, fetch guild commands and search them instead.
				const id = message.client.application.commands.cache.find(cmd => cmd.name === "locale")?.id ?? 0;
				context += t`Search language: **${localisedInputLanguage}** (${inputLanguage}). Check defaults with </locale get:${id}> and configure with </locale set:${id}>`;
			} else {
				const localisedType = c("command-option").gettext("konami-id");
				context += t`Search type: ${localisedType}`;
			}
			replyOptions = { content: t`Could not find a Rush Duel card matching \`${input}\`!` + context };
		} else {
			const embed = createRushCardEmbed(card, resultLanguage, this.limitRegulation);
			replyOptions = { embeds: [embed] };
		}
		return [card, replyOptions];
	}
}

type CardSearcherMap = Record<SearchSummon["type"], CardSearcher>;
export const cardSearcherProvider = instanceCachingFactory<CardSearcherMap>(container => {
	const logger = getLogger("events:message:search");
	const got = container.resolve<Got>("got").extend({
		// Default got behaviour, with logging hooked in https://github.com/sindresorhus/got/tree/v11.8.6#retry
		retry: {
			limit: 2,
			// retry immediately, but pass through 0 values that cancel the retry
			calculateDelay: ({ attemptCount, error, computedValue }) => {
				logger.info(`Retry ${attemptCount} (${computedValue} ms): `, error);
				return computedValue;
			}
		}
	});
	return {
		ocg: new OCGCardSearcher(got, container.resolve("limitRegulationMasterDuel")),
		rush: new RushCardSearcher(got, container.resolve("limitRegulationRush"))
	};
});

function createMisconfigurationEmbed(error: DiscordAPIError, message: Message): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(Colors.Red)
		.setTitle(t`⚠️ I am missing permissions in the channel!`)
		.setURL(message.url)
		.setDescription(
			t`Please have a server administrator [fix this](https://github.com/DawnbrandBots/bastion-bot#discord-permissions).`
		)
		.setFooter({ text: error.message });
}

function prependEmbed(replyOptions: MessageReplyOptions, embed: EmbedBuilder): MessageReplyOptions {
	return {
		...replyOptions,
		embeds: [embed, ...(replyOptions.embeds ?? [])]
	};
}

// Same hack as in card.ts
const rc = c;

@injectable()
export class SearchMessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message:search");

	readonly #debugChannels = new Set(process.env.LOG_ALL_MESSAGE_CHANNEL?.split(","));

	constructor(
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("cardSearchers") private cardSearchers: CardSearcherMap,
		private metrics: Metrics,
		private recentCache: RecentMessageCache,
		private abdeploy: ABDeploy,
		private eventLocks: EventLocker
	) {}

	protected log(level: keyof Logger, message: Message, ...args: Parameters<Logger[keyof Logger]>): void {
		const context = {
			channel: message.channelId,
			message: message.id,
			guild: message.guildId,
			author: message.author.id,
			ping: message.client.ws.ping
		};
		this.#logger[level](JSON.stringify(context), ...args);
	}

	async run(message: Message): Promise<void> {
		if (this.#debugChannels.has(message.channelId)) {
			this.#logger.verbose(
				JSON.stringify({
					...(message.toJSON() as object),
					channel: message.channel.toJSON()
				})
			);
		}
		if (shouldIgnore(message)) {
			return;
		}
		// Deactivate new functionality in select servers
		// Always active in direct messages, threads, voice chats
		if (
			message.guildId &&
			this.abdeploy.has(message.guildId) &&
			!message.channel.isThread() &&
			!message.channel.isVoiceBased()
		) {
			return;
		}
		if (!message.guildId && process.env.BOT_NO_DIRECT_MESSAGE_SEARCH) {
			return;
		}
		if (!this.eventLocks.has(message.id, this.type)) {
			return;
		}
		const delimiter = getDelimiter(message);
		const inputs = preprocess(message.content, delimiter);
		if (inputs.length === 0) {
			return;
		}
		this.log("info", message, JSON.stringify(inputs));
		const uniqueInputs = OrderedSet(inputs).slice(0, 3); // remove duplicates, then select first three
		message.channel.sendTyping().catch(error => this.log("info", message, error));
		this.addReaction(message, "🕙");
		const language = await this.locales.getM(message);
		const promises = uniqueInputs.map(async hit => {
			const [card, replyOptions] = await this.cardSearchers[hit.type].search(message, hit.summon, language);
			try {
				const reply = await message.reply(replyOptions);
				return [card, reply] as const;
			} catch (error) {
				const userConfigurationErrors: unknown[] = [
					RESTJSONErrorCodes.MissingPermissions,
					RESTJSONErrorCodes.CannotReplyWithoutPermissionToReadMessageHistory,
					RESTJSONErrorCodes.MissingAccess // missing Send Messages in Threads
				];
				if (error instanceof DiscordAPIError && userConfigurationErrors.includes(error.code)) {
					this.log("info", message, hit.summon, error);
					message.author
						.send(prependEmbed(replyOptions, createMisconfigurationEmbed(error, message)))
						.catch(e => this.log("info", message, hit.summon, e));
				} else {
					this.log("error", message, error);
				}
				return [card] as const;
			}
		});
		const results = await Promise.allSettled(promises);
		const replies = [];
		for (const [i, result] of results.entries()) {
			if (result.status === "fulfilled") {
				const [card, reply] = result.value;
				this.metrics.writeSearch(message, JSON.stringify(inputs[i]), card, reply);
				if (reply) {
					replies.push(reply.id);
				}
			} else {
				// Exception from getCard
				this.metrics.writeSearch(message, JSON.stringify(inputs[i]));
				this.log("error", message, inputs[i], result.reason);
			}
		}
		this.recentCache.set(message, replies);
		this.removeReaction(message, "🕙");
	}

	async addReaction(message: Message, reaction: EmojiIdentifierResolvable): Promise<MessageReaction | undefined> {
		if (message.inGuild() && message.guild.members.me) {
			if (!message.guild.members.me.permissionsIn(message.channel).has(PermissionsBitField.Flags.AddReactions)) {
				this.log("info", message, "Missing permissions to add reactions");
				return;
			}
		}
		try {
			return await message.react(reaction);
		} catch (error) {
			const userConfigurationErrors: unknown[] = [
				RESTJSONErrorCodes.MissingPermissions,
				RESTJSONErrorCodes.ReactionWasBlocked, // blocking Bastion prevents reacting to author messages
				RESTJSONErrorCodes.MissingAccess // must have Read Message History to react to messages
			];
			if (error instanceof DiscordAPIError && userConfigurationErrors.includes(error.code)) {
				this.log("info", message, error);
			} else {
				this.log("warn", message, error);
			}
		}
	}

	async removeReaction(message: Message, reaction: string): Promise<MessageReaction | undefined> {
		try {
			return await message.reactions.cache.get(reaction)?.users.remove(message.client.user);
		} catch (error) {
			if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage) {
				this.log("info", message, "Message deleted before removing reaction");
			} else {
				this.log("warn", message, error);
			}
		}
	}
}
