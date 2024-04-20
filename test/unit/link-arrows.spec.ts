import { LinkArrow } from "../../src/definitions";
import { linkArrowsEmoji } from "../../src/link-arrows";

describe("linkArrowsEmoji", () => {
	it.each([
		{
			name: "Link Spider",
			arrows: [LinkArrow.Bottom],
			emoji: "<:LinkMarker_LeftMiddle_12:1102794524545273879><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "Striker Dragon",
			arrows: [LinkArrow.Left],
			emoji: "<:LinkMarker_LeftMiddle_4:1102794519281405963><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "Kagari",
			arrows: [LinkArrow["Top-Left"]],
			emoji: "<:LinkMarker_LeftMiddle_7:1102794520774574110><:LinkMarker_Right_0:1102794415149432992>"
		}
	])("LINK-$arrows.length: $name", ({ arrows, emoji }) => {
		expect(linkArrowsEmoji(arrows)).toBe(emoji);
	});
});
