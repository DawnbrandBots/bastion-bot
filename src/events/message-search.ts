import { Message } from "discord.js";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { Listener } from ".";
import { createCardEmbed, getCard } from "../card";
import { LocaleProvider } from "../locale";
import { getLogger } from "../logger";
import { addFunding, addNotice } from "../utils";

@injectable()
export class SearchMessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message:search");

	constructor(@inject("LocaleProvider") private locales: LocaleProvider) {}

	async run(message: Message): Promise<void> {
		if (message.author.bot) {
			return;
		}
		// parse markdown, remove code blocks ```, `, spoiler tags ||
		// ignore doubled-up brackets?
		const inputs: string[] = [];
		let remaining = message.content;
		while (remaining.includes("<")) {
			const intermediate = remaining.slice(1 + remaining.indexOf("<"));
			const endPosition = intermediate.indexOf(">");
			const input = intermediate.slice(0, endPosition);
			// Skip if this is a Discord markdown element
			// https://discord.com/developers/docs/reference#message-formatting
			// also strip and skip if blank
			// skip if contains "(" or ignore-case "anime" as a heuristic
			inputs.push(input);
			remaining = intermediate.slice(1 + endPosition);
		}
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
