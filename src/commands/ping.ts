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
		await interaction.reply(content); // Actually returns void
		const reply = await interaction.fetchReply();
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms`);
			return latency;
		} else {
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms\nUnexpected response format`);
			return latency;
		}
	}
}
