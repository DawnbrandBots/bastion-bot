import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { inject, injectable } from "tsyringe";
import { c, t } from "ttag";
import { Command } from "../Command";
import { buildLocalisedChoice, buildLocalisedCommand, Locale, LocaleProvider, LOCALE_CHOICES } from "../locale";
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
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder(),
			() => c("command-name").t`locale`,
			() => c("command-description").t`Check or set Bastion's locale for this channel or server.`
		);
		const getSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`get`,
			() => c("command-option-description").t`Check Bastion's locale setting for this channel or server.`
		);
		const setSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`set`,
			() => c("command-option-description").t`Override Bastion's locale for this channel or server.`
		);
		const scopeOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`scope`,
			() => c("command-option-description").t`Edit just this channel or the whole server?`
		).addChoices(
			buildLocalisedChoice("channel", () => c("command-option-choice").t`channel`),
			buildLocalisedChoice("server", () => c("command-option-choice").t`server`)
		);
		const localeOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`locale`,
			() => c("command-option-description").t`The new default language to use in this channel or server.`
		).addChoices(
			buildLocalisedChoice("default", () => c("command-option-choice").t`Discord default`),
			...LOCALE_CHOICES
		);
		setSubcommand.addStringOption(scopeOption).addStringOption(localeOption);
		builder.addSubcommand(getSubcommand).addSubcommand(setSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		let content = "";
		if (interaction.options.getSubcommand() === "get") {
			if (interaction.inGuild()) {
				const channelOverride = await this.#locales.channel(this.#locales.getChannel(interaction));
				const guildOverride = await this.#locales.guild(interaction.guildId);
				if (channelOverride) {
					content += t`Locale override for this channel: ${channelOverride}`;
					content += "\n";
				}
				if (guildOverride) {
					content += t`Locale override for this server: ${guildOverride}`;
					content += "\n";
				}
				content += t`Discord Community locale for this server: ${interaction.guildLocale}`;
			} else {
				const override = await this.#locales.channel(interaction.channelId);
				if (override) {
					content += t`Locale override for this direct message: ${override}`;
					content += "\n";
				}
				content += t`Your Discord locale: ${interaction.locale}`;
			}
		} else {
			// subcommand set
			const locale = interaction.options.getString("locale", true) as Locale | "default";
			if (interaction.inGuild()) {
				const scope = interaction.options.getString("scope", true);
				if (scope === "channel") {
					if (interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
						const channel = this.#locales.getChannel(interaction);
						if (locale !== "default") {
							await this.#locales.setForChannel(channel, locale);
							content = t`Locale for current channel <#${channel}> overridden with ${locale}.`;
						} else {
							await this.#locales.setForChannel(channel, null);
							content = t`Locale for current channel <#${channel}> reset to server default.`;
						}
						const guildOverride = await this.#locales.guild(interaction.guildId);
						if (guildOverride) {
							content += "\n";
							content += t`Server-wide locale override: ${guildOverride}`;
						}
						content += "\n";
						content += t`Discord Community locale for this server: ${interaction.guildLocale}`;
					} else {
						content = t`Sorry, you must have the Manage Channel permission in this channel. If you think this is an error, contact your server admin or report a bug.`;
					}
				} else {
					// server-wide
					if (interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
						if (locale !== "default") {
							await this.#locales.setForGuild(interaction.guildId, locale);
							content = t`Locale for this server overriden with ${locale}.`;
						} else {
							await this.#locales.setForGuild(interaction.guildId, null);
							content = t`Locale for this server reset to Discord Community default.`;
						}
						content += "\n";
						content += t`Server-wide default for community servers is ${interaction.guildLocale}.`;
					} else {
						content = t`Sorry, you must have the Manage Server permission to do this. If you think this is an error, contact your server admin or report a bug.`;
					}
				}
			} else {
				// direct message, ignore scope
				if (locale !== "default") {
					await this.#locales.setForChannel(interaction.channelId, locale);
					content = t`Locale for this direct message overridden with ${locale}. Your Discord setting is ${interaction.locale}.`;
				} else {
					await this.#locales.setForChannel(interaction.channelId, null);
					content = t`Locale for this direct message reset to Discord default. Your Discord setting is ${interaction.locale}.`;
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
