import { AsyncLocalStorage } from "async_hooks";
import debug, { Debug } from "debug";
import { AutocompleteInteraction, CommandInteraction, escapeMarkdown, Message, WebhookClient } from "discord.js";
import util from "util";

const global = debug("bot");

const webhook = process.env.BOT_LOGGER_WEBHOOK ? new WebhookClient({ url: process.env.BOT_LOGGER_WEBHOOK }) : null;

export const asyncLocalStorage = new AsyncLocalStorage<CommandInteraction | AutocompleteInteraction | Message>();

function contextLog(log: debug.Debugger): LogFunction {
	return function (msg: string | Record<string, unknown>, error?: Error) {
		const asyncContext = asyncLocalStorage.getStore();
		const context =
			asyncContext &&
			("commandId" in asyncContext
				? {
						channel: asyncContext.channelId,
						message: asyncContext.id,
						guild: asyncContext.guildId,
						author: asyncContext.user.id,
						id: asyncContext.commandId,
						command: asyncContext.commandName
					}
				: {
						channel: asyncContext.channelId,
						message: asyncContext.id,
						guild: asyncContext.guildId,
						author: asyncContext.author.id
					});
		if (context || error) {
			log(
				JSON.stringify({
					msg,
					...(context && { context }),
					...(error && {
						error,
						stack: error.stack
					})
				})
			);
		} else if (typeof msg === "string") {
			log(msg);
		} else {
			log(JSON.stringify(msg));
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

interface LogFunction {
	(msg: string, error?: Error): void;
	(obj: Record<string, unknown>, error?: Error): void;
}

export interface Logger {
	error: LogFunction;
	warn: LogFunction;
	notify: LogFunction;
	info: LogFunction;
	verbose: LogFunction;
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
