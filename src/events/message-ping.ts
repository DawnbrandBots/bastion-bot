import { APIEmbed, Colors, DiscordAPIError, EmbedBuilder, Message, RESTJSONErrorCodes } from "discord.js";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { Listener } from ".";
import { EventLocker } from "../event-lock";
import { LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";

@injectable()
export class PingMessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message:ping");

	constructor(@inject("LocaleProvider") private locales: LocaleProvider, private eventLocks: EventLocker) {}

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
		if (message.author.bot || message.reference) {
			return;
		}
		if (
			message.client.user &&
			message.mentions.has(message.client.user, { ignoreEveryone: true, ignoreRoles: true })
		) {
			if (!this.eventLocks.has(message.id, PingMessageListener.name)) {
				this.log("verbose", message, "skipNoLock");
				return;
			}
			const lang = await this.locales.getM(message);
			useLocale(lang);
			const ping = message.client.ws.ping;
			const content = t`Average WebSocket ping (new instance): ${ping} ms`;
			const embed: APIEmbed = {
				title: t`Free and open source _Yu-Gi-Oh!_ bot`,
				description: t`
❓ Help documentation on [GitHub](https://github.com/DawnbrandBots/bastion-bot), or use \`.commands\` and \`.help\`.
🟢 Licence: [GNU AGPL 3.0+](https://choosealicense.com/licenses/agpl-3.0/).
🪧 Bastion Misawa is a character from [Yu-Gi-Oh! GX](https://yugipedia.com/wiki/Bastion_Misawa).
<:PRO:1028300625122963567> Sponsored by [YGOPRODECK](https://ygoprodeck.com). Prices are YGOPRODECK affiliate links.

<:patreon:895892186841890816> Support us [on Patreon](https://www.patreon.com/alphakretinbots) and help keep the bot online!
<:kofi:927373724959789096> Ko-fi also works for [one-time donations](https://ko-fi.com/dawnbrandbots).

🛠️ Improvements are regularly being worked on and rolled out. The new search experience is here!
🤖 New features like Slash Commands are handled by a new bot instance concurrently with the old bot.

💬 Translations missing? Help translate Bastion on [GitHub](https://github.com/DawnbrandBots/bastion-bot).
`,
				color: Colors.Yellow,
				author: {
					name: "Bastion",
					url: "https://github.com/DawnbrandBots/bastion-bot",
					icon_url:
						"https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.webp"
				},
				footer: {
					text: t`Revision: ${process.env.BOT_REVISION}.`
				}
			};
			const replyOptions = {
				content: `${process.env.BOT_MOTD}\n\n${content}`,
				embeds: [embed]
			};
			let response;
			try {
				response = await message.reply(replyOptions);
			} catch (error) {
				const userConfigurationErrors: unknown[] = [
					RESTJSONErrorCodes.MissingPermissions,
					RESTJSONErrorCodes.CannotReplyWithoutPermissionToReadMessageHistory,
					RESTJSONErrorCodes.MissingAccess // missing Send Messages in Threads
				];
				if (error instanceof DiscordAPIError && userConfigurationErrors.includes(error.code)) {
					this.log("info", message, error);
					message.author
						.send({
							embeds: [
								new EmbedBuilder()
									.setColor(Colors.Red)
									.setTitle(t`⚠️ You pinged me, but I am missing permissions in the channel!`)
									.setURL(message.url)
									.setDescription(
										t`Please have a server administrator [fix this](https://github.com/DawnbrandBots/bastion-bot#discord-permissions).`
									)
									.setFooter({ text: error.message }),
								embed
							]
						})
						.catch(e => this.log("info", message, e));
				} else {
					this.log("error", message, error);
				}
				return;
			}
			useLocale(lang);
			const latency = response.createdTimestamp - message.createdTimestamp;
			const addendum = t`Total latency: ${latency} ms`;
			this.log("info", message, { latency });
			try {
				await response.edit(`${response.content}\n${addendum}`);
			} catch (error) {
				this.log("error", message, error);
			}
		}
	}
}
