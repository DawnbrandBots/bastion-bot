import { SlashCommandStringOption } from "@discordjs/builders";
import {
	ApplicationIntegrationType,
	AutocompleteInteraction,
	CacheType,
	ChatInputCommandInteraction,
	CommandInteraction,
	EmbedBuilder,
	Guild,
	GuildCacheMessage,
	Message
} from "discord.js";
import { gettext, t, useLocale } from "ttag";

export function serialiseServer(server: Guild): string {
	const createdAt = new Date(server.createdAt).toISOString();
	return `${server.name} (${server.id}) [${server.memberCount}] ${createdAt} by <@${server.ownerId}>`;
}

export function serialiseInteraction(
	interaction: CommandInteraction | AutocompleteInteraction,
	extras?: Record<string, unknown>
): string {
	return JSON.stringify({
		channel: interaction.channelId,
		message: interaction.id,
		guild: interaction.guildId,
		author: interaction.user.id,
		id: interaction.commandId,
		command: interaction.commandName,
		channelType: interaction.channel?.type,
		context: interaction.context,
		authorizingIntegrationOwners: interaction.authorizingIntegrationOwners,
		...extras
	});
}

// Adds a development notice to embed output
export function addNotice(embeds: EmbedBuilder | EmbedBuilder[]): EmbedBuilder[] {
	if (!Array.isArray(embeds)) {
		embeds = [embeds];
	}
	embeds[embeds.length - 1].addFields([
		{
			name: t`🛠️ This command is in development.`,
			value: t`📨 Please send feedback to [our issue tracker](https://github.com/DawnbrandBots/bastion-bot) or the [support server](https://discord.gg/4aFuPyuE96)!`
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
export function addFunding(embeds: EmbedBuilder | EmbedBuilder[], chance = 0.25): EmbedBuilder[] {
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
export function replyLatency(reply: Message<boolean>, interaction: ChatInputCommandInteraction): number {
	return reply.createdTimestamp - interaction.createdTimestamp;
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
export function editLatency(reply: GuildCacheMessage<CacheType>, interaction: ChatInputCommandInteraction): number {
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

export function shouldIgnore(message: Message): boolean {
	return (
		// Ignore system messages as we cannot reply to them
		message.system ||
		// Ignore bots to prevent infinite loops and other potentially malicious abuse, except from our Singing Lanius
		(message.author.bot && message.author.id !== process.env.HEALTHCHECK_BOT_SNOWFLAKE)
	);
}

// If the user has user-installed Bastion, then authorizingIntegrationOwners.1 will be present.
// If Bastion is invoked in direct messages, authorizingIntegrationOwners.0 = "0".
// If Bastion is invoked in an installed server, authorizingIntegrationOwners.0 = "SERVER_ID".
// Therefore, the only case where we are directly invoking the user-installed version, whether in
// a direct message or server without Bastion, is when authorizingIntegrationOwners.0 is not present.
export function shouldExcludeIcons(interaction: ChatInputCommandInteraction): boolean {
	return !interaction.authorizingIntegrationOwners[ApplicationIntegrationType.GuildInstall];
}
