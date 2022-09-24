import { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { inject, injectable } from "tsyringe";
import { Command } from "../Command";
import { getLogger, Logger } from "../logger";
import { Metrics } from "../metrics";
import { replyLatency } from "../utils";

@injectable()
export class LinkCommand extends Command {
	#logger = getLogger("command:link");

	constructor(@inject(Metrics) metrics: Metrics) {
		super(metrics);
	}

	static links: Record<string, { name: string; result: string }> = {
		lftcg: {
			name: "TCG Banlist",
			result: "https://www.yugioh-card.com/uk/limited/"
		},
		lfocg: {
			name: "OCG Banlist",
			result: "https://www.yugioh-card.com/my/event/rules_guides/forbidden_cardlist.php?lang=en"
		},
		lfko: {
			name: "Korean Banlist",
			result: "http://yugioh.co.kr/site/limit_regulation.php"
		},
		dubsum: {
			name: "Double Summon List",
			result: "https://ygorganization.com/doublesummonlist/"
		},
		forget: {
			name: "Forgetting",
			result: "https://ygorganization.com/learnrulingspart13/"
		},
		dmgstep: {
			name: "Damage Step",
			result: "https://www.yugioh-card.com/uk/gameplay/damage.html\nhttp://yugipedia.com/wiki/Damage_Step#Cards_and_effects_that_can_be_activated"
		},
		linksum: {
			name: "Link Summons",
			result: "https://cdn.discordapp.com/attachments/377682286394736650/690868673157791774/unknown.png"
		},
		fetc: {
			name: "Fast Effect Timing Chart",
			result: "https://img.yugioh-card.com/en/wp-content/uploads/2021/05/T-Flowchart_EN-US.jpg"
		},
		sumneg: {
			name: "Summon Negation Timing",
			result: "https://puu.sh/CLinf/3332459d3c.png"
		},
		atkdef: {
			name: "ATK/DEF Modification",
			result: "https://ygorganization.com/atk-def-modification-and-you/"
		},
		nomi: {
			name: "Special Summon Monsters",
			result: "https://cdn.discordapp.com/attachments/184324960842416129/680508513105346659/nomi_monsters.png"
		},
		rivgoz: {
			name: "Rivalry/Gozen Rulings",
			result: "https://img.yugioh-card.com/ygo_cms/ygo/all/uploads/CardFAQ_Rivalry-of-Warlords_Gozen-Match-1.pdf"
		}
	};

	static override get meta(): RESTPostAPIApplicationCommandsJSONBody {
		return {
			name: "link",
			description: "Display one of several links with useful information.",
			options: [
				{
					type: ApplicationCommandOptionType.String.valueOf(),
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

	protected override get logger(): Logger {
		return this.#logger;
	}

	protected override async execute(interaction: ChatInputCommandInteraction): Promise<number> {
		const key = interaction.options.getString("key", true);
		const content = LinkCommand.links[key].result;
		const reply = await interaction.reply({ content, fetchReply: true });
		return replyLatency(reply, interaction);
	}
}
