import { BaseMessageOptions, ChatInputCommandInteraction } from "discord.js";
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
		const switcher = new ArtSwitcher(
			[
				{
					illustration: "MekkKnightCrusadiaAvramax-MADU-EN-VG-artwork.png",
					index: 1,
					image: "MekkKnightCrusadiaAvramax-RA01-EN-SR-1E.png"
				}
			],
			"test"
		);
		await switcher.editReply(interaction, "en");
		expect(editReply).toHaveBeenCalledTimes(1);
		expect(editReply).toHaveBeenCalledWith<[BaseMessageOptions]>(
			expect.objectContaining({
				content:
					"https://yugipedia.com/wiki/Special:Redirect/file/MekkKnightCrusadiaAvramax-MADU-EN-VG-artwork.png?utm_source=bastion"
			})
		);
	});
	it("shows image if no illustrations", async () => {
		const switcher = new ArtSwitcher(
			[
				{
					index: 1,
					image: "Shuttleroid-PP11-JP-ScR.jpg"
				}
			],
			"test"
		);
		await switcher.editReply(interaction, "en");
		expect(editReply).toHaveBeenCalledTimes(1);
		expect(editReply).toHaveBeenCalledWith<[BaseMessageOptions]>(
			expect.objectContaining({
				content:
					"https://yugipedia.com/wiki/Special:Redirect/file/Shuttleroid-PP11-JP-ScR.jpg?utm_source=bastion"
			})
		);
	});
	// TODO: test multiple-image cases, using
	// // awaitMessageComponent.mockRejectedValue(new DiscordjsError(DiscordjsErrorCodes.InteractionCollectorError));
});
