import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { Command } from "../Command";
import { LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class LocaleCommand extends Command {
	#logger = getLogger("command:locale");
	#locales: LocaleProvider;

	constructor(metrics: Metrics, @inject("LocaleProvider") locales: LocaleProvider) {
		super(metrics);
		this.#locales = locales;
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
							.addChoices({ name: "channel", value: "channel" }, { name: "server", value: "server" })
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName("locale")
							.setDescription("The new default language to use in this channel or server.")
							.setRequired(true)
							.addChoices(
								{ name: "Discord default", value: "default" },
								{ name: "English", value: "en" },
								{ name: "Français", value: "fr" },
								{ name: "Deutsch", value: "de" },
								{ name: "Italiano", value: "it" },
								{ name: "Português", value: "pt" }
							)
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
			if (interaction.inGuild()) {
				const channelOverride = await this.#locales.channel(this.#locales.getChannel(interaction));
				const guildOverride = await this.#locales.guild(interaction.guildId);
				content = "";
				if (channelOverride) {
					content += `Locale override for this channel: ${channelOverride}\n`;
				}
				if (guildOverride) {
					content += `Locale override for this server: ${guildOverride}\n`;
				}
				content += `Discord Community locale for this server: ${interaction.guildLocale}`;
			} else {
				const override = await this.#locales.channel(interaction.channelId);
				if (override) {
					content = `Locale override for this direct message: ${override}\nYour Discord locale: ${interaction.locale}`;
				} else {
					content = `Your Discord locale: ${interaction.locale}`;
				}
			}
		} else {
			// subcommand set
			const locale = interaction.options.getString("locale", true);
			if (interaction.inGuild()) {
				const scope = interaction.options.getString("scope", true);
				if (scope === "channel") {
					if (interaction.memberPermissions.has("MANAGE_CHANNELS")) {
						const channel = this.#locales.getChannel(interaction);
						if (locale !== "default") {
							await this.#locales.setForChannel(channel, locale);
							content = `Locale for current channel <#${channel}> overridden with ${locale}.`;
						} else {
							await this.#locales.setForChannel(channel, null);
							content = `Locale for current channel <#${channel}> reset to server default.`;
						}
						const guildOverride = await this.#locales.guild(interaction.guildId);
						if (guildOverride) {
							content += `\nServer-wide locale override: ${guildOverride}`;
						}
						content += `\nDiscord Community locale for this server: ${interaction.guildLocale}`;
					} else {
						content =
							"Sorry, you must have the Manage Channel permission in this channel. If you think this is an error, contact your server admin or report a bug.";
					}
				} else {
					// server-wide
					if (interaction.memberPermissions.has("MANAGE_GUILD")) {
						if (locale !== "default") {
							await this.#locales.setForGuild(interaction.guildId, locale);
							content = `Locale for this server overriden with ${locale}.`;
						} else {
							await this.#locales.setForGuild(interaction.guildId, null);
							content = `Locale for this server reset to Discord Community default.`;
						}
						content += `\nServer-wide default for community servers is ${interaction.guildLocale}.`;
					} else {
						content =
							"Sorry, you must have the Manage Server permission to do this. If you think this is an error, contact your server admin or report a bug.";
					}
				}
			} else {
				// direct message, ignore scope
				if (locale !== "default") {
					await this.#locales.setForChannel(interaction.channelId, locale);
					content = `Locale for this direct message overridden with ${locale}. Your Discord setting is ${interaction.locale}.`;
				} else {
					await this.#locales.setForChannel(interaction.channelId, null);
					content = `Locale for this direct message reset to Discord default. Your Discord setting is ${interaction.locale}.`;
				}
			}
		}
		const reply = await interaction.reply({
			content,
			//ephemeral: true,
			fetchReply: true
		});
		return replyLatency(reply, interaction);
	}
}
