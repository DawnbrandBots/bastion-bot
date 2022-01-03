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
