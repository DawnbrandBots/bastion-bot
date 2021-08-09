import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";

@injectable()
export class LinkCommand extends Command {
	#logger = getLogger("command:link");

	// can be moved to a more reasonable/configurable place later in branch development
	// surely can do better on type here
	static links: { [key: string]: { name: string; result: string } } = {
		lftcg: {
			name: "TCG Banlist",
			result: "https://www.yugioh-card.com/en/limited/"
		},
		lfocg: {
			name: "OCG Banlist",
			result: "https://www.yugioh-card.com/my/event/rules_guides/forbidden_cardlist.php?lang=en"
		}
	};

	static override get meta(): ApplicationCommandData {
		const choices = Object.keys(LinkCommand.links).map(k => {
			return {
				name: LinkCommand.links[k].name,
				value: k
			};
		});
		return {
			name: "link",
			description: "Display one of several links with useful information.",
			options: [
				{
					type: "STRING",
					name: "key",
					description: "The name of the link you want to display.",
					required: true,
					choices
				}
			]
		};
	}

	static override get aliases(): string[] {
		return [];
	}

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: CommandInteraction): Promise<number> {
		const key = interaction.options.getString("key");
		const content = `WebSocket ping: ${interaction.client.ws.ping} ms`;
		await interaction.reply(content); // Actually returns void
		const reply = await interaction.fetchReply();
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms`);
			return latency;
		} else {
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			await interaction.editReply(`${content}\nTotal latency: ${latency} ms\nUnexpected response format`);
			return latency;
		}
	}
}
