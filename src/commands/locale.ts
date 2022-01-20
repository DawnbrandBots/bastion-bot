import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class LocaleCommand extends Command {
	#logger = getLogger("command:locale");

	constructor(metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("locale")
			.setDescription("Check or set Bastion's locale for this channel or server.")
			.addSubcommand(subcommand => subcommand.setName("get").setDescription("Check Bastion's locale setting."))
			.addSubcommand(subcommand =>
				subcommand
					.setName("set")
					.setDescription("Override Bastion's locale for this channel or server.")
					.addStringOption(option =>
						option
							.setName("scope")
							.setDescription("Edit just this channel or the whole server?")
							.addChoices([
								["channel", "channel"],
								["server", "server"]
							])
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName("locale")
							.setDescription("The new default language to use in this channel or server.")
							.setRequired(true)
							.addChoice("English", "en")
							.addChoice("Français", "fr")
							.addChoice("Deutsch", "de")
							.addChoice("Italiano", "it")
							.addChoice("Português", "pt")
					)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		let content: string;
		if (interaction.options.getSubcommand() === "get") {
			content = `Your locale: ${interaction.locale}\nServer locale: ${interaction.guildLocale}`;
		} else {
			// subcommand set
			const locale = interaction.options.getString("locale");
			if (interaction.guildId === null) {
				// direct message, ignore scope
				content = `Locale for this direct message overridden with ${locale}. Your Discord setting is ${interaction.locale}.`;
			} else {
				const scope = interaction.options.getString("scope");
				if (scope === "channel") {
					if (interaction.memberPermissions?.has("MANAGE_CHANNELS")) {
						content = `Locale for current channel ${interaction.channel} overridden with ${locale}. Server-wide setting is ${interaction.guildLocale}.`;
					} else {
						content =
							"Sorry, you must have the Manage Channel permission in this channel. If you think this is an error, contact your server admin or report a bug.";
					}
				} else {
					// server-wide
					if (interaction.memberPermissions?.has("MANAGE_GUILD")) {
						content = `Locale for this server overriden with ${locale}. Server-wide default for community servers is ${interaction.guildLocale}.`;
					} else {
						content =
							"Sorry, you must have the Manage Server permission to do this. If you think this is an error, contact your server admin or report a bug.";
					}
				}
			}
		}
		const reply = await interaction.reply({
			content,
			ephemeral: true,
			fetchReply: true
		});
		return replyLatency(reply, interaction);
	}
}
