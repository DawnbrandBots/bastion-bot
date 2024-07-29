import { ChatInputCommandInteraction, DiscordjsError, DiscordjsErrorCodes } from "discord.js";
import { ArtSwitcher } from "../../src/art";

describe("ArtSwitcher", () => {
	const awaitMessageComponent = jest.fn();
	const editReply = jest.fn();
	const reply = jest.fn();
	const mockInteraction = { editReply, reply };
	const interaction = mockInteraction as unknown as ChatInputCommandInteraction;
	beforeEach(() => {
		awaitMessageComponent.mockReset();
		editReply.mockReset().mockReturnValue({ awaitMessageComponent });
		reply.mockReset().mockReturnValue({ awaitMessageComponent });
	});
	it.each(["reply", "editReply"] as const)("shows single illustration using %s", async method => {
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
		await switcher.send(interaction, method, "en");
		expect(mockInteraction[method]).toHaveBeenCalledTimes(1);
		expect(mockInteraction[method].mock.calls[0][0]).toMatchSnapshot();
	});
	it.each(["reply", "editReply"] as const)("shows image if no illustrations using %s", async method => {
		const switcher = new ArtSwitcher(
			[
				{
					index: 1,
					image: "Shuttleroid-PP11-JP-ScR.jpg"
				}
			],
			"test"
		);
		await switcher.send(interaction, method, "en");
		expect(mockInteraction[method]).toHaveBeenCalledTimes(1);
		expect(mockInteraction[method].mock.calls[0][0]).toMatchSnapshot();
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
	it.each(["reply", "editReply"] as const)("shows first of two illustrations using %s", async method => {
		awaitMessageComponent.mockRejectedValue(
			Reflect.construct(DiscordjsError, [DiscordjsErrorCodes.InteractionCollectorError])
		);
		const interaction = { ...mockInteraction, user: {} } as unknown as ChatInputCommandInteraction;
		const switcher = new ArtSwitcher(CARTESIA_IMAGES, "test");
		await switcher.send(interaction, method, "en");
		expect(mockInteraction[method]).toHaveBeenCalledTimes(1);
		expect(mockInteraction[method].mock.calls[0][0]).toMatchSnapshot();
	});
	it.todo("shows second of two illustrations");
});
