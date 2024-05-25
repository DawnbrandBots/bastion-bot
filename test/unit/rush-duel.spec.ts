import { videoGameIllustration, videoGameIllustrationURL } from "../../src/rush-duel";

describe("Rush Duel card illustrations", () => {
	test.each([
		{
			en: "Yggdrago the Sky Emperor [L]",
			expected: "YggdragotheSkyEmperorL-G002-JP-VG-artwork.png"
		},
		{
			en: "CAN:D LIVE",
			expected: "CANDLIVE-G002-JP-VG-artwork.png"
		},
		{
			en: "Powerful Pierce!!",
			expected: "PowerfulPierce-G002-JP-VG-artwork.png"
		},
		{
			en: "1-Up",
			expected: "1Up-G002-JP-VG-artwork.png"
		},
		{
			en: "Romic n' Roller",
			expected: "RomicnRoller-G002-JP-VG-artwork.png"
		}
	])("videoGameIllustration returns $expected for: $en", ({ en, expected }) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mockCard = { name: { en } } as any;
		expect(videoGameIllustration(mockCard)).toEqual(expected);
	});
	test("videoGameIllustrationURL", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mockCard = { name: { en: "Sevens Road Magician" } } as any;
		expect(videoGameIllustrationURL(mockCard)).toEqual(
			"https://yugipedia.com/wiki/Special:Redirect/file/SevensRoadMagician-G002-JP-VG-artwork.png?utm_source=bastion"
		);
	});
});
