import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class LocaleCommand extends Command {
	#logger = getLogger("command:locale");

	constructor(metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder().setName("locale").setDescription("Check locale for this channel.").toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const reply = await interaction.reply({
			content: `Your locale: ${interaction.locale}\nServer locale: ${interaction.guildLocale}`,
			fetchReply: true
		});
		return "createdTimestamp" in reply ? reply.createdTimestamp - interaction.createdTimestamp : -1;
	}
}
