import { CommandInteraction, Guild } from "discord.js";

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
