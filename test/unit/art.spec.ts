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
		expect(editReply.mock.calls[0][0]).toMatchSnapshot();
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
		expect(editReply.mock.calls[0][0]).toMatchSnapshot();
	});
	const CARTESIA_IMAGES = [
		{
			illustration: "BlazingCartesiatheVirtuous-MADU-JP-VG-artwork.png",
			index: 1,
			image: "BlazingCartesiatheVirtuous-DABL-JP-SR.png"
		},
		{
			illustration: "BlazingCartesiatheVirtuous-MADU-EN-VG-artwork.png",
			index: "1.1",
			image: "BlazingCartesiatheVirtuous-MP23-EN-PScR-1E.png"
		}
	];
	it("shows first of two illustrations", async () => {
		awaitMessageComponent.mockRejectedValue(new DiscordjsError(DiscordjsErrorCodes.InteractionCollectorError));
		const interaction = { editReply, user: {} } as unknown as ChatInputCommandInteraction;
		const switcher = new ArtSwitcher(CARTESIA_IMAGES, "test");
		await switcher.editReply(interaction, "en");
		expect(editReply).toHaveBeenCalledTimes(1);
		expect(editReply.mock.calls[0][0]).toMatchSnapshot();
	});
	it.todo("shows second of two illustrations");
});
