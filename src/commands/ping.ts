import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { buildLocalisedCommand, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class PingCommand extends Command {
	#logger = getLogger("command:ping");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`ping`,
			() => c("command-description").t`Test latency to the new bot instance.`
		).toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const lang = await this.locales.get(interaction);
		useLocale(lang);
		const ping = interaction.client.ws.ping;
		const content = t`Average WebSocket ping (new instance): ${ping} ms`;
		const reply = await interaction.reply({ content, fetchReply: true });
		useLocale(lang);
		const latency = replyLatency(reply, interaction);
		const addendum = t`Total latency: ${latency} ms`;
		await interaction.editReply(`${content}\n${addendum}`);
		return latency;
	}
}
