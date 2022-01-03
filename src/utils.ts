import { CommandInteraction, Guild, MessageEmbed } from "discord.js";

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
			name: ":tools: This command is in development.",
			value: ":incoming_envelope: Please send feedback to [our issue tracker](https://github.com/DawnbrandBots/bastion-bot) or the [support server](https://discord.gg/4aFuPyuE96)!"
		}
	]);
	return embeds;
}

const messages = [
	"Please consider supporting us!",
	"Help keep Bastion online!",
	"Please help keep Bastion online!",
	"We need your support! Bastion has mostly been funded out-of-pocket for years.",
	"Was Bastion helpful? Consider supporting us!",
	"Was Bastion helpful? We need your support!",
	"Did you find Bastion useful? Consider supporting us!",
	"Did you find Bastion useful? Help keep it online!",
	"Did you find Bastion useful? We need your support!",
	"Enjoy Bastion? Help keep it online!",
	"Enjoy Bastion? Consider supporting us!",
	"Found what you were looking for? Consider supporting us!",
	"Bastion has mostly been funded out-of-pocket for years. Help keep it online!"
];

// Has a random chance of adding a funding notice
export function addFunding(embeds: MessageEmbed | MessageEmbed[]): MessageEmbed[] {
	if (!Array.isArray(embeds)) {
		embeds = [embeds];
	}
	if (Math.random() < 0.25) {
		embeds[embeds.length - 1].addFields([
			{
				name: messages[Math.floor(Math.random() * messages.length)],
				value: "<:patreon:895892186841890816> [https://www.patreon.com/alphakretinbots](https://www.patreon.com/alphakretinbots)"
			}
		]);
	}
	return embeds;
}
