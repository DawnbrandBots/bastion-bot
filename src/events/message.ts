import { Message, MessageEmbedOptions } from "discord.js";
import { inject, injectable } from "tsyringe";
import { t, useLocale } from "ttag";
import { Listener } from ".";
import { LocaleProvider } from "../locale";
import { getLogger } from "../logger";

@injectable()
export class MessageListener implements Listener<"messageCreate"> {
	readonly type = "messageCreate";

	#logger = getLogger("events:message");

	constructor(@inject("LocaleProvider") private locales: LocaleProvider) {}

	async run(message: Message): Promise<void> {
		if (message.author.bot || message.reference) {
			return;
		}
		if (
			message.client.user &&
			message.mentions.has(message.client.user, { ignoreEveryone: true, ignoreRoles: true })
		) {
			try {
				const lang = await this.locales.getM(message);
				useLocale(lang);
				const ping = message.client.ws.ping;
				const content = t`Average WebSocket ping (new instance): ${ping} ms`;
				const embed: MessageEmbedOptions = {
					title: t`Free and open source _Yu-Gi-Oh!_ bot`,
					description: t`
:question: Help documentation on [GitHub](https://github.com/DawnbrandBots/bastion-bot), or use \`.commands\` and \`.help\`.
:green_circle: Licence: [GNU AGPL 3.0+](https://choosealicense.com/licenses/agpl-3.0/).
:money_mouth: Prices from https://yugiohprices.com
:placard: Bastion Misawa is a character from [Yu-Gi-Oh! GX](https://yugipedia.com/wiki/Bastion_Misawa).

**Bastion has mostly been funded out-of-pocket for years.**
<:patreon:895892186841890816> Support us [on Patreon](https://www.patreon.com/alphakretinbots) and help keep the bot online!
<:kofi:927373724959789096> Ko-fi also works for [one-time donations](https://ko-fi.com/dawnbrandbots).

:tools: An update is being worked on and rolling out slowly. Features will be handled by a new bot instance through Slash Commands concurrently with the old bot.
`,
					color: "YELLOW",
					author: {
						name: "Bastion",
						url: "https://github.com/DawnbrandBots/bastion-bot",
						iconURL:
							"https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.webp"
					},
					footer: {
						text: t`Revision: ${process.env.BOT_REVISION}.`
					}
				};
				const response = await message.reply({
					content: `${process.env.BOT_MOTD}\n\n${content}`,
					embeds: [embed]
				});
				useLocale(lang);
				const latency = response.createdTimestamp - message.createdTimestamp;
				const addendum = t`Total latency: ${latency} ms`;
				await response.edit(`${response.content}\n${addendum}`);
				this.#logger.verbose(
					JSON.stringify({
						channel: message.channel.id,
						message: message.id,
						guild: message.guild?.id,
						author: message.author.id,
						ping,
						latency
					})
				);
			} catch (error) {
				this.#logger.error(
					JSON.stringify({
						channel: message.channel.id,
						message: message.id,
						guild: message.guild?.id,
						author: message.author.id,
						content: message.content
					}),
					error
				);
			}
		}
	}
}
