import { ApplicationCommandData, CommandInteraction } from "discord.js";
import { injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";

@injectable()
export class LinkCommand extends Command {
	#logger = getLogger("command:link");

	// can be moved to a more reasonable/configurable place later in branch development
	static links: Record<string, { name: string; result: string }> = {
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
		return {
			name: "link",
			description: "Display one of several links with useful information.",
			options: [
				{
					type: "STRING",
					name: "key",
					description: "The name of the link you want to display.",
					required: true,
					choices: Object.keys(LinkCommand.links).map(k => {
						return {
							name: LinkCommand.links[k].name,
							value: k
						};
					})
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
		const key = interaction.options.getString("key", true);
		const content = LinkCommand.links[key].result;
		await interaction.reply(content); // Actually returns void
		const reply = await interaction.fetchReply();
		// return latency
		if ("createdTimestamp" in reply) {
			const latency = reply.createdTimestamp - interaction.createdTimestamp;
			return latency;
		} else {
			const latency = Number(reply.timestamp) - interaction.createdTimestamp;
			return latency;
		}
	}
}
