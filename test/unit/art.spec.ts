import { ChatInputCommandInteraction, DiscordjsError, DiscordjsErrorCodes } from "discord.js";
import { ArtSwitcher } from "../../src/art";

describe("ArtSwitcher", () => {
	const awaitMessageComponent = jest.fn();
	const editReply = jest.fn();
	const interaction = { editReply } as unknown as ChatInputCommandInteraction;
	beforeEach(() => {
		awaitMessageComponent.mockReset();
		editReply.mockReset().mockReturnValue({ awaitMessageComponent });
	});
	it("shows single illustration", async () => {
		awaitMessageComponent.mockRejectedValue(new DiscordjsError(DiscordjsErrorCodes.InteractionCollectorError));
		const switcher = new ArtSwitcher(
			[
				{
					illustration: "https://example.net/illustration.png",
					index: 1,
					image: "https://example.net/image.png"
				}
			],
			null,
			"test"
		);
		await switcher.editReply(interaction, "en");
		expect(editReply).toHaveBeenCalled();
	});
	it.todo("shows video game illustration if available");
	it.todo("shows image if no illustrations");
});
