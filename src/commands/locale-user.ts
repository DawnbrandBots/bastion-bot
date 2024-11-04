import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import {
	ApplicationIntegrationType,
	InteractionContextType,
	RESTPostAPIApplicationCommandsJSONBody
} from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { LOCALE_CHOICES, Locale, LocaleProvider, buildLocalisedChoice, buildLocalisedCommand } from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class LocaleUserCommand extends Command {
	#logger = getLogger("command:locale-user");
	#locales: LocaleProvider;

	constructor(metrics: Metrics, @inject("LocaleProvider") locales: LocaleProvider) {
		super(metrics);
		this.#locales = locales;
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			new SlashCommandBuilder()
				.setIntegrationTypes(ApplicationIntegrationType.UserInstall)
				.setContexts(InteractionContextType.BotDM, InteractionContextType.PrivateChannel),
			() => c("command-name").t`locale-user`,
			() => c("command-description").t`Check or set user-installed Bastion's locale.`
		);
		const getSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`get`,
			() => c("command-option-description").t`Check your user-installed Bastion's locale.`
		);
		const setSubcommand = buildLocalisedCommand(
			new SlashCommandSubcommandBuilder(),
			() => c("command-option").t`set`,
			() => c("command-option-description").t`Configure your user-installed Bastion's locale.`
		);
		const localeOption = buildLocalisedCommand(
			new SlashCommandStringOption().setRequired(true),
			() => c("command-option").t`locale`,
			() => c("command-option-description").t`The new default language to use for user-installed Bastion.`
		).addChoices(
			buildLocalisedChoice("default", () => c("command-option-choice").t`Discord default`),
			...LOCALE_CHOICES
		);
		setSubcommand.addStringOption(localeOption);
		builder.addSubcommand(getSubcommand).addSubcommand(setSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private async useLocaleAfterWrite(interaction: ChatInputCommandInteraction): Promise<void> {
		const effectiveLocale = await this.#locales.get(interaction);
		useLocale(effectiveLocale);
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		let content = "";
		if (interaction.options.getSubcommand() === "get") {
			const effectiveLocale = await this.#locales.get(interaction);
			const override = await this.#locales.channel(interaction.channelId);
			useLocale(effectiveLocale);
			if (override) {
				content += t`Locale override for this direct message: ${override}`;
				content += "\n";
			}
			content += t`Your Discord locale: ${interaction.locale}`;
		} else {
			// subcommand set
			const locale = interaction.options.getString("locale", true) as Locale | "default";
			if (locale !== "default") {
				await this.#locales.setForChannel(interaction.channelId, locale);
				await this.useLocaleAfterWrite(interaction);
				content = t`Locale for this direct message overridden with ${locale}. Your Discord setting is ${interaction.locale}.`;
			} else {
				await this.#locales.setForChannel(interaction.channelId, null);
				await this.useLocaleAfterWrite(interaction);
				content = t`Locale for this direct message reset to Discord default. Your Discord setting is ${interaction.locale}.`;
			}
		}
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
