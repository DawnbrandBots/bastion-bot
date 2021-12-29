import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { APICard } from "./deck";

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

	async getCard(type: "password" | "kid" | "name", input: string): Promise<APICard | undefined> {
		let url = `${process.env.SEARCH_API}`; // treated as string instead of string? without forbidden non-null check
		if (type === "password") {
			url += `/card/password/${input}`;
		} else if (type === "kid") {
			url += `/card/kid/${input}`;
		} else {
			url += `/search?name=${input}`;
		}
		const response = await fetch(url);
		if (response.status === 404) {
			return undefined;
		}
		return await response.json();
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		let type = interaction.options.getString("type", false) as "password" | "kid" | "name" | undefined;
		let input = interaction.options.getString("input", true);
		if (!type) {
			if (parseInt(input).toString() === input) {
				// if its all digits, treat as password.
				type = "password";
			} else if (input.startsWith("#")) {
				// initial # indicates KID, as long as the rest is digits
				const kid = input.slice(1);
				if (parseInt(kid).toString() === kid) {
					type = "kid";
					input = kid;
				} else {
					type = "name";
				}
			} else {
				type = "name";
			}
		}
		const card = await this.getCard(type, input);
		if (!card) {
			// TODO: include properly-named type in this message
			await interaction.reply({ content: `Could not find a card matching \`${input}\`!`, ephemeral: true });
		} else {
			const embed = new MessageEmbed()
				.setTitle(card?.en.name)
				.addField("Password", card.password.toString(), true)
				.addField("Konami ID", card.kid.toString(), true);
			// TODO: decide on ephemerality
			await interaction.reply({ embeds: [embed], ephemeral: true }); // Actually returns void
		}
		const reply = await interaction.fetchReply();
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			return latency;
		} else {
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			return latency;
		}
	}
}
