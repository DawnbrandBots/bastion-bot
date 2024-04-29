import { AsyncLocalStorage } from "async_hooks";
import debug, { Debug } from "debug";
import { AutocompleteInteraction, CommandInteraction, escapeMarkdown, Message, WebhookClient } from "discord.js";
import util from "util";
import { serialiseInteraction } from "./utils";

const global = debug("bot");

const webhook = process.env.BOT_LOGGER_WEBHOOK ? new WebhookClient({ url: process.env.BOT_LOGGER_WEBHOOK }) : null;

export const asyncLocalStorage = new AsyncLocalStorage<CommandInteraction | AutocompleteInteraction | Message>();

function contextLog(log: debug.Debugger): Debug["log"] {
	return function (...args: Parameters<debug.Debugger>) {
		const context = asyncLocalStorage.getStore();
		if (context) {
			if ("commandId" in context) {
				log(serialiseInteraction(context), ...args);
			} else {
				log(
					JSON.stringify({
						channel: context.channelId,
						message: context.id,
						guild: context.guildId,
						author: context.author.id
					}),
					...args
				);
			}
		} else {
			log(...args);
		}
	};
}
function withWebhook(log: debug.Debugger): Debug["log"] {
	if (webhook) {
		return function (...args: Parameters<debug.Debugger>) {
			contextLog(log)(...args);
			webhook
				.send({
					username: log.namespace,
					content: escapeMarkdown(util.format(...args)),
					allowedMentions: { parse: [] }
				})
				.catch(error => {
					contextLog(log)("Failed to notify webhook.", error);
				});
		};
	} else {
		return contextLog(log);
	}
}

export interface Logger {
	error: Debug["log"];
	warn: Debug["log"];
	notify: Debug["log"];
	info: Debug["log"];
	verbose: Debug["log"];
}

export function getLogger(namespace: string): Logger {
	return {
		error: withWebhook(global.extend(`error:${namespace}`)),
		warn: withWebhook(global.extend(`warn:${namespace}`)),
		notify: withWebhook(global.extend(`notify:${namespace}`)),
		info: contextLog(global.extend(`info:${namespace}`)),
		verbose: contextLog(global.extend(`verbose:${namespace}`))
	};
}
