import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class PingCommand extends Command {
	#logger = getLogger("command:ping");

	constructor(metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("ping")
			.setDescription("Test latency to the new bot instance.")
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const content = `Average WebSocket ping (new instance): ${interaction.client.ws.ping} ms`;
		const reply = await interaction.reply({ content, fetchReply: true });
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms`);
			return latency;
		} else {
			// This should never happen, as Bastion must be a member of its servers and also we are not using deferReply
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms\nThis should never been seen.`);
			return latency;
		}
	}
}
