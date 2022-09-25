import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { injectable } from "tsyringe";
import { getCard, inferInputType } from "../card";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { addNotice, searchQueryTypeStringOption } from "../utils";

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
			.addStringOption(searchQueryTypeStringOption)
			.toJSON();
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const [type, input] = inferInputType(interaction);
		await interaction.deferReply({ ephemeral: true });
		const card = await getCard(type, input);
		let end: number;
		if (!card) {
			end = Date.now();
			// TODO: include properly-named type in this message
			await interaction.editReply({ content: `Could not find a card matching \`${input}\`!` });
		} else {
			const embed = new EmbedBuilder().setTitle(`${card.name.en}`).addFields([
				{ name: "Password", value: `${card.password}`, inline: true },
				{ name: "Konami ID", value: `${card.konami_id}`, inline: true }
			]);
			end = Date.now();
			await interaction.editReply({ embeds: addNotice(embed) });
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
