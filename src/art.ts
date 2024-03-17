import { Static } from "@sinclair/typebox";
import { Debug } from "debug";
import {
	ActionRowBuilder,
	BaseMessageOptions,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	DiscordAPIError,
	DiscordjsErrorCodes,
	Message
} from "discord.js";
import { Got } from "got";
import { t, useLocale } from "ttag";
import { CardSchema } from "./definitions";
import { RushCardSchema } from "./definitions/rush";
import { Locale } from "./locale";
import { Logger, getLogger } from "./logger";
import { serialiseInteraction } from "./utils";

export async function checkYugipediaRedirect(got: Got, url: string, warn: Debug["log"]): Promise<boolean> {
	try {
		const response = await got(url, {
			method: "HEAD",
			followRedirect: false,
			timeout: 2000
		});
		if (response.statusCode === 302) {
			// MediaWiki Special:Redirect/file should only use 302s
			return true;
		} else if (response.statusCode !== 404) {
			warn({ redirectStatusCode: response.statusCode });
		}
	} catch (error) {
		warn(error);
	}
	return false;
}

export class ArtSwitcher {
	private readonly logger: Logger;

	private readonly labelButton = new ButtonBuilder()
		.setCustomId("label")
		.setStyle(ButtonStyle.Primary)
		.setDisabled(true);
	private readonly prevButton = new ButtonBuilder()
		.setCustomId("prev")
		.setEmoji("⬅")
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true);
	private readonly nextButton = new ButtonBuilder()
		.setCustomId("next")
		.setEmoji("➡")
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(true);
	private readonly components = [
		new ActionRowBuilder<ButtonBuilder>().addComponents(this.labelButton, this.prevButton, this.nextButton)
	];

	private index = 0;

	constructor(
		private readonly images: NonNullable<Static<typeof RushCardSchema | typeof CardSchema>["images"]>,
		private readonly videoGameIllustration: string | null,
		context: string
	) {
		this.labelButton.setLabel(this.label);
		this.nextButton.setDisabled(images.length === 1);
		this.logger = getLogger(`command:${context}:switcher`);
	}

	private get label(): string {
		return `${this.index + 1} / ${this.images.length}`;
	}

	private get currentImage(): string {
		// The video game illustration, if it exists, may replace the first image
		return (
			(this.index === 0 && this.videoGameIllustration) ||
			`https://yugipedia.com/wiki/Special:Redirect/file/${
				this.images[this.index].illustration ?? this.images[this.index].image
			}?utm_source=bastion`
		);
	}

	private get replyOptions(): BaseMessageOptions {
		return {
			content: this.currentImage,
			components: this.components
		};
	}

	private onClick(interaction: ButtonInteraction): void {
		if (interaction.customId === "prev") {
			if (this.index > 0) {
				this.index--;
			}
		} else {
			if (this.index < this.images.length - 1) {
				this.index++;
			}
		}
		this.prevButton.setDisabled(this.index === 0);
		this.nextButton.setDisabled(this.index === this.images.length - 1);
		this.labelButton.setLabel(this.label);
	}

	async editReply(parentInteraction: ChatInputCommandInteraction, resultLanguage: Locale): Promise<Message> {
		const reply = await parentInteraction.editReply(this.replyOptions);
		const filter = (childInteraction: ButtonInteraction): boolean => {
			this.logger.info(serialiseInteraction(parentInteraction), `click: ${childInteraction.user.id}`);
			if (childInteraction.user.id === parentInteraction.user.id) {
				return true;
			}
			useLocale(resultLanguage);
			childInteraction
				.reply({
					content: t`Buttons can only be used by the user who called Bastion.`,
					ephemeral: true
				})
				.catch(e => this.logger.error(serialiseInteraction(parentInteraction), e));
			return false;
		};
		// Set up the button handler (don't await) and return the initial reply
		const awaitOptions = { filter, componentType: ComponentType.Button, time: 60000 } as const;
		const then = async (childInteraction: ButtonInteraction): Promise<void> => {
			this.onClick(childInteraction);
			// We have to set up the handler again because Discord.js is forcing the maximum number of events to 1
			// https://github.com/discordjs/discord.js/blob/fb70df817c6566ca100d57ec1878a4573489a43d/packages/discord.js/src/structures/InteractionResponse.js#L30
			(await childInteraction.update(this.replyOptions))
				.awaitMessageComponent(awaitOptions)
				.then(then)
				.catch(catcher);
		};
		const catcher = async (err: DiscordAPIError): Promise<void> => {
			// a rejection can just mean the timeout was reached without a response
			// otherwise, though, we want to treat it as a normal error
			if (err.code !== DiscordjsErrorCodes.InteractionCollectorError) {
				this.logger.error(serialiseInteraction(parentInteraction), err);
			} else {
				this.logger.verbose(serialiseInteraction(parentInteraction), err);
				if (err.message.split("reason: ")[1].toLowerCase().includes("delete")) {
					return;
				}
			}
			// disable original buttons, except when deleted since there's nothing toe dit
			this.prevButton.setDisabled(true);
			this.nextButton.setDisabled(true);
			try {
				await parentInteraction.editReply(this.replyOptions);
			} catch (e) {
				this.logger.error(serialiseInteraction(parentInteraction), e);
			}
		};
		reply.awaitMessageComponent(awaitOptions).then(then).catch(catcher);
		return reply;
	}
}
