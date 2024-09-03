import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction } from "discord.js";
import { Got } from "got";
import { inject, injectable } from "tsyringe";
import { c, t, useLocale } from "ttag";
import { Command } from "../Command";
import { ArtSwitcher } from "../art";
import { getCard, getCardSearchOptions, getRubylessCardName, masterDuelIllustration } from "../card";
import {
	LocaleProvider,
	buildLocalisedCommand,
	everywhereCommand,
	getKonamiIdSubcommand,
	getNameSubcommand,
	getPasswordSubcommand
} from "../locale";
import { Logger, getLogger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class ArtCommand extends Command {
	#logger = getLogger("command:art");

	constructor(
		metrics: Metrics,
		@inject("LocaleProvider") private locales: LocaleProvider,
		@inject("got") private got: Got
	) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		const builder = buildLocalisedCommand(
			everywhereCommand(),
			() => c("command-name").t`art`,
			() => c("command-description").t`Display the art for a card!`
		);
		const nameSubcommand = getNameSubcommand(
			() => c("command-option-description").t`Display the art for the card with this name.`
		);
		const passwordSubcommand = getPasswordSubcommand(
			() => c("command-option-description").t`Display the art for the card with this password.`
		);
		const konamiIdSubcommand = getKonamiIdSubcommand(
			() => c("command-option-description").t`Display the art for the card with this official database ID.`
		);
		builder.addSubcommand(nameSubcommand).addSubcommand(passwordSubcommand).addSubcommand(konamiIdSubcommand);
		return builder.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const { type, input, resultLanguage, inputLanguage } = await getCardSearchOptions(interaction, this.locales);
		const card = await getCard(this.got, type, input, inputLanguage);
		let reply;
		if (!card) {
			useLocale(resultLanguage);
			reply = await interaction.reply({
				content: t`Could not find a card matching \`${input}\`!`,
				fetchReply: true
			});
		} else if (!card.images) {
			const name = getRubylessCardName(card.name[resultLanguage] || `${card.konami_id}`, resultLanguage);
			useLocale(resultLanguage);
			reply = await interaction.reply({
				content: t`Could not find art for \`${name}\`!`,
				fetchReply: true
			});
		} else {
			// Avoid the latency of checking a wiki redirect on every command
			if (card.master_duel_rarity && !card.images[0].illustration) {
				card.images[0].illustration = masterDuelIllustration(card);
			}
			const switcher = new ArtSwitcher(card.images, "art");
			reply = await switcher.send(interaction, "reply", resultLanguage);
		}
		return replyLatency(reply, interaction);
	}
}
