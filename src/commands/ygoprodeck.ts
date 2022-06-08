import { SlashCommandBuilder } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import fetch from "../fetch";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { editLatency } from "../utils";

@injectable()
export class YGOPRODECKCommand extends Command {
	#logger = getLogger("command:ygoprodeck");

	constructor(metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("ygoprodeck")
			.setDescription("Search the YGOPRODECK card database.")
			.addStringOption(option =>
				option
					.setName("term")
					.setDescription("The name or password of the card you're looking for.")
					.setRequired(true)
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	private async search(term: string): Promise<string> {
		const url = new URL("https://db.ygoprodeck.com/carddbsearch_name.php");
		url.searchParams.set("term", term);
		const response = await (await fetch(url.href)).json();
		if ("error" in response) {
			return response.error;
		} else {
			return `https://db.ygoprodeck.com/card/?search=${encodeURIComponent(response.name)}`;
		}
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const term = interaction.options.getString("term", true);
		await interaction.reply(`Searching YGOPRODECK for \`${term}\`…`);
		const result = await this.search(term);
		const reply = await interaction.editReply(result);
		return editLatency(reply, interaction);
	}
}
