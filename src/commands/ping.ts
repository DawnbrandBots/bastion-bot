import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { COMMAND_LOCALIZATIONS, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class PingCommand extends Command {
	#logger = getLogger("command:ping");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = new SlashCommandBuilder()
			.setName("ping")
			.setDescription("Test latency to the new bot instance.");

		for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
			useLocale(gettext);
			builder
				.setNameLocalization(discord, c("command-name").t`ping`)
				.setDescriptionLocalization(discord, c("command-description").t`Test latency to the new bot instance.`);
		}

		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const lang = await this.locales.get(interaction);
		useLocale(lang);
		const content = t`Average WebSocket ping (new instance): ${interaction.client.ws.ping} ms`;
		const reply = await interaction.reply({ content, fetchReply: true });
		if ("createdTimestamp" in reply) {
			useLocale(lang);
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			const addendum = t`Total latency: ${latency} ms`;
			await interaction.editReply(`${content}\n${addendum}`);
			return latency;
		} else {
			// This should never happen, as Bastion must be a member of its servers and also we are not using deferReply
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms\nThis should never been seen.`);
			return latency;
		}
	}
}
