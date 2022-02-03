import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { injectable } from "tsyringe";
import { getCard } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { addNotice } from "../utils";

@injectable()
export class IdCommand extends Command {
	#logger = getLogger("command:id");

	constructor(metrics: Metrics) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("id")
			.setDescription("Identify a card by password, Konami ID, or name.")
			.addStringOption(
				new SlashCommandStringOption()
					.setName("input")
					.setDescription("The password, Konami ID, or name you're searching by.")
					.setRequired(true)
			)
			.addStringOption(
				new SlashCommandStringOption()
					.setName("type")
					.setDescription("Whether you're searching by password, Konami ID, or name.")
					.setRequired(false)
					.addChoice("Password", "password")
					.addChoice("Konami ID", "kid")
					.addChoice("Name", "name")
			)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		let type = interaction.options.getString("type", false) as "password" | "kid" | "name" | undefined;
		let input = interaction.options.getString("input", true);
		if (!type) {
			// handle edge case for specific bad input
			if (parseInt(input).toString() === input && input !== "NaN") {
				// if its all digits, treat as password.
				type = "password";
			} else if (input.startsWith("#")) {
				// initial # indicates KID, as long as the rest is digits
				const kid = input.slice(1);
				if (parseInt(kid).toString() === kid && kid !== "NaN") {
					type = "kid";
					input = kid;
				} else {
					type = "name";
				}
			} else {
				type = "name";
			}
		}
		await interaction.deferReply({ ephemeral: true });
		const card = await getCard(type, input);
		let end: number;
		if (!card) {
			end = Date.now();
			// TODO: include properly-named type in this message
			await interaction.editReply({ content: `Could not find a card matching \`${input}\`!` });
		} else {
			const embed = new MessageEmbed()
				.setTitle(card?.en.name)
				.addField("Password", `${card.password}`, true)
				.addField("Konami ID", `${card.kid}`, true);
			end = Date.now();
			await interaction.editReply({ embeds: addNotice(embed) });
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
