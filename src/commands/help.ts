import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { c, useLocale } from "ttag";
import { Command } from "../Command";
import { COMMAND_LOCALIZATIONS, LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class HelpCommand extends Command {
	#logger = getLogger("command:help");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = new SlashCommandBuilder().setName("help").setDescription("Get help with a Slash Command.");

		// update this when documentation is added for new commands!
		const documentedCommands = [
			"art",
			"deck",
			"id",
			"link",
			"locale",
			"random",
			"search",
			"ygoprodeck",
			"yugipedia"
		];

		const option = new SlashCommandStringOption()
			.setName("command")
			.setDescription("The name of a specific Slash Command.")
			.addChoices(
				...documentedCommands.map(s => {
					return { name: s, value: s };
				})
			)
			.setRequired(false);

		for (const { gettext, discord } of COMMAND_LOCALIZATIONS) {
			useLocale(gettext);
			builder
				.setNameLocalization(discord, c("command-name").t`help`)
				.setDescriptionLocalization(discord, c("command-description").t`Get help with a Slash Command.`);
			option
				.setNameLocalization(discord, c("command-option").t`command`)
				.setDescriptionLocalization(
					discord,
					c("command-option-description").t`The name of a specific Slash Command.`
				);
		}

		builder.addStringOption(option);

		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const command = interaction.options.getString("command", false);

		let output: string;

		if (command) {
			output = `<https://github.com/DawnbrandBots/bastion-bot/blob/master/docs/commands/${command}.md>`;
		} else {
			output = `<https://github.com/DawnbrandBots/bastion-bot/tree/master/docs/commands>`;
		}

		const reply = await interaction.reply({ content: output, ephemeral: true, fetchReply: true });

		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			return latency;
		} else {
			// This should never happen, as Bastion must be a member of its servers and also we are not using deferReply
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			return latency;
		}
	}
}
