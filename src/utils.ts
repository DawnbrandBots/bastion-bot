import { SlashCommandStringOption } from "@discordjs/builders";
import { CacheType, CommandInteraction, Guild, GuildCacheMessage, MessageEmbed } from "discord.js";
import { gettext, t, useLocale } from "ttag";

export function serializeServer(server: Guild): string {
	if ("name" in server) {
		const createdAt = new Date(server.createdAt).toISOString();
		return `${server.name} (${server.id}) [${server.memberCount}] ${createdAt} by <@${server.ownerId}>`;
	} else {
		return `${server.id}`;
	}
}

export function serializeCommand(interaction: CommandInteraction, extras?: Record<string, unknown>): string {
	return JSON.stringify({
		channel: interaction.channel?.id,
		message: interaction.id,
		guild: interaction.guild?.id,
		author: interaction.user.id,
		id: interaction.commandId,
		command: interaction.commandName,
		...extras
	});
}

// Adds a development notice to embed output
export function addNotice(embeds: MessageEmbed | MessageEmbed[]): MessageEmbed[] {
	if (!Array.isArray(embeds)) {
		embeds = [embeds];
	}
	embeds[embeds.length - 1].addFields([
		{
			name: t`:tools: This command is in development.`,
			value: t`:incoming_envelope: Please send feedback to [our issue tracker](https://github.com/DawnbrandBots/bastion-bot) or the [support server](https://discord.gg/4aFuPyuE96)!`
		}
	]);
	return embeds;
}

// Guarantee default locale at import time since the resulting strings matter.
// This could be buried in addFunding but then we would have to localise all
// strings every time when only one gets used.
useLocale("en");
const messages = [
	t`Please consider supporting us!`,
	t`Help keep Bastion online!`,
	t`Please help keep Bastion online!`,
	t`Was Bastion helpful? Consider supporting us!`,
	t`Was Bastion helpful? We need your support!`,
	t`Did you find Bastion useful? Consider supporting us!`,
	t`Did you find Bastion useful? Help keep it online!`,
	t`Did you find Bastion useful? We need your support!`,
	t`Enjoy Bastion? Help keep it online!`,
	t`Enjoy Bastion? Consider supporting us!`,
	t`Found what you were looking for? Consider supporting us!`
];

// Same hack as in card.ts
const rt = gettext;

// Has a random chance of adding a funding notice
export function addFunding(embeds: MessageEmbed | MessageEmbed[], chance = 0.25): MessageEmbed[] {
	if (!Array.isArray(embeds)) {
		embeds = [embeds];
	}
	if (Math.random() < chance) {
		embeds[embeds.length - 1].addFields([
			{
				name: rt(messages[Math.floor(Math.random() * messages.length)]),
				value: `
<:patreon:895892186841890816> [https://www.patreon.com/alphakretinbots](https://www.patreon.com/alphakretinbots)
<:kofi:927373724959789096> [https://ko-fi.com/dawnbrandbots](https://ko-fi.com/dawnbrandbots)
`
			}
		]);
	}
	return embeds;
}

/**
 * Compute the interval from command invocation to response for a command based
 * on the reply timestamp. Do not use when the reply must be edited to be considered
 * complete, such as when using deferReply.
 *
 * @param reply The canonical reply to a Slash Command invocation.
 * @param interaction The triggering command interaction.
 * @returns latency in milliseconds
 */
export function replyLatency(reply: GuildCacheMessage<CacheType>, interaction: CommandInteraction): number {
	if ("createdTimestamp" in reply) {
		return reply.createdTimestamp - interaction.createdTimestamp;
	} else {
		// This should never happen, as Bastion must be a member of its servers.
		return -1;
	}
}

/**
 * Compute the interval from command invocation to response last edited for a command.
 * Do not use if the response is never edited, or when deferReply is used, since
 * editedTimestamp will be null.
 *
 * @param reply The canonical reply to a Slash Command invocation that has been edited, excluding deferReply.
 * @param interaction The triggering command interaction.
 * @returns latency in milliseconds
 */
export function editLatency(reply: GuildCacheMessage<CacheType>, interaction: CommandInteraction): number {
	if ("editedTimestamp" in reply && reply.editedTimestamp !== null) {
		return reply.editedTimestamp - interaction.createdTimestamp;
	} else {
		// This should never happen, as Bastion must be a member of its servers.
		return -1;
	}
}

// Locating this here is tentative and this format for translations is experimental
export const searchQueryTypeStringOption = new SlashCommandStringOption()
	.setName("type")
	.setDescription("Whether you're searching by password, Konami ID, or name.")
	.setRequired(false)
	.addChoices(
		{ value: "password", name: "Password", name_localizations: { "zh-CN": "密码", "zh-TW": "密码" } },
		{
			value: "kid",
			name: "Konami ID",
			name_localizations: { "zh-CN": "科乐美官方数据库编号", "zh-TW": "科樂美官方數據庫編號" }
		},
		{ value: "name", name: "Name", name_localizations: { "zh-CN": "名", "zh-TW": "名" } }
	);

export function splitText(outString: string, cap = 1024): string[] {
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
