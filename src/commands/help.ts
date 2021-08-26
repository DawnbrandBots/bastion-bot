import { ChatInputApplicationCommandData, CommandInteraction, MessageEmbedOptions } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";

@injectable()
export class HelpCommand extends Command {
	#logger = getLogger("command:help");

	static override get meta(): ChatInputApplicationCommandData {
		return {
			name: "help",
			description: "Learn how to use this bot."
		};
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	readonly EMBED: MessageEmbedOptions = {
		title: "Free and open source Yu-Gi-Oh! bot",
		description: `
:question: Help documentation on [GitHub](https://github.com/AlphaKretin/bastion-bot), or use \`.commands\`.
:green_circle: Licence: [GNU AGPL 3.0+](https://choosealicense.com/licenses/agpl-3.0/).
Prices from https://yugiohprices.com
Bastion Misawa is a character from [Yu-Gi-Oh! GX](https://yugipedia.com/wiki/Bastion_Misawa).
[:moneybag: Patreon](https://www.patreon.com/alphakretinbots)

`,
		color: "YELLOW",
		author: {
			name: "Bastion",
			url: "https://github.com/AlphaKretin/bastion-bot",
			iconURL: "https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.webp"
		}
	};

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const latency = Date.now() - interaction.createdTimestamp;
		await interaction.reply({
			content: process.env.BOT_MOTD || undefined,
			embeds: [
				{
					...this.EMBED,
					footer: {
						text: `Revision: ${process.env.BOT_REVISION}.`
					}
				}
			]
		});
		return latency;
	}
}
