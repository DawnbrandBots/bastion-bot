import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { Static } from "@sinclair/typebox";
import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v9";
import { CommandInteraction, FileOptions } from "discord.js";
import fetch from "node-fetch";
import { inject, injectable } from "tsyringe";
import { getCard, inferInputType } from "../card";
import { Command } from "../Command";
import { CardSchema } from "../definitions";
import { LocaleProvider } from "../locale";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";

@injectable()
export class ArtCommand extends Command {
	#logger = getLogger("command:art");

	constructor(metrics: Metrics, @inject("LocaleProvider") private locales: LocaleProvider) {
		super(metrics);
	}

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return new SlashCommandBuilder()
			.setName("art")
			.setDescription("Display the art for a card!")
			.addStringOption(
				new SlashCommandStringOption()
					.setName("input")
					.setDescription("The password, Konami ID, or name to search for a card.")
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

	async getArt(card: Static<typeof CardSchema>): Promise<FileOptions | undefined> {
		const artUrl = `${process.env.IMAGE_HOST}/${card.password}.png`;
		const response = await fetch(artUrl);
		// 400: Bad syntax, 404: Not found
		if (response.status === 400 || response.status === 404) {
			return undefined;
		}
		// 200: OK
		if (response.status === 200) {
			const art = await response.buffer();
			return { attachment: art };
		}
		throw new Error((await response.json()).message);
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		let type = interaction.options.getString("type", false) as "password" | "kid" | "name" | undefined;
		let input = interaction.options.getString("input", true);
		[type, input] = inferInputType(type, input);
		await interaction.deferReply();
		const card = await getCard(type, input);
		let end: number;
		if (!card) {
			end = Date.now();
			// TODO: include properly-named type in this message
			await interaction.editReply({ content: `Could not find a card matching \`${input}\`!` });
		} else {
			const artFile = await this.getArt(card);
			end = Date.now();
			if (artFile) {
				// TODO: display name along with art?
				await interaction.editReply({ files: [artFile] }); // Actually returns void
			} else {
				const lang = (await this.locales.get(interaction)) as "en" | "fr" | "de" | "it" | "pt";
				await interaction.editReply({ content: `Could not find art for \`${card[lang]?.name || card.kid}\`!` });
			}
		}
		// When using deferReply, editedTimestamp is null, as if the reply was never edited, so provide a best estimate
		const latency = end - interaction.createdTimestamp;
		return latency;
	}
}
