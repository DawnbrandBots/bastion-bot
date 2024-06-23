import { EmbedBuilder } from "discord.js";
import { addTip, suggestSearchTrigger, videoGameIllustration, videoGameIllustrationURL } from "../../src/rush-duel";

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

describe("Rush Duel search trigger suggestion helpers", () => {
	test.each([
		{ input: "Dark Magician Girl", korean: false, expected: "r<Dark Magician Girl>" },
		{ input: "I Hear Footsteps", korean: false, expected: "<I Hear Footsteps>r" },
		{ input: "Fusion", korean: false, expected: "R<Fusion>" },
		{ input: "CAN - Sp:D", korean: false, expected: "<CAN - Sp:D>R" },
		{ input: "메타리온 아슈라스타", korean: true, expected: "러<메타리온 아슈라스타>" },
		{ input: "욕망의 항아리", korean: true, expected: "<욕망의 항아리>러" }
	])("suggestSearchTrigger returns $expected for ($korean): $input", ({ input, korean, expected }) => {
		expect(suggestSearchTrigger(input, korean)).toEqual(expected);
	});

	test("addTip", () => {
		const embed = new EmbedBuilder().setFooter({ text: "Not yet released" });
		const result = addTip(embed, "r<foobar>");
		expect(result.data.footer?.text).toEqual(
			"Not yet released\nUsing r<foobar>, you can search for Rush Duel cards directly in messages without autocomplete"
		);
	});
});
