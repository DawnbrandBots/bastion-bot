import { LinkArrow } from "../../src/definitions";
import { linkArrowsEmoji } from "../../src/link-arrows";

describe("linkArrowsEmoji", () => {
	it.each([
		{
			name: "Link Spider",
			arrows: [LinkArrow.Bottom],
			emoji: "<:LinkMarker_LeftMiddle_2:1102794515661725716><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "Striker Dragon",
			arrows: [LinkArrow.Left],
			emoji: "<:LinkMarker_LeftMiddle_4:1102794519281405963><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "Sky Striker Ace - Kagari",
			arrows: [LinkArrow["Top-Left"]],
			emoji: "<:LinkMarker_LeftMiddle_7:1102794520774574110><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "Sky Striker Ace - Shizuku",
			arrows: [LinkArrow["Top-Right"]],
			emoji: "<:LinkMarker_LeftMiddle_0:1102794510444011581><:LinkMarker_Right_9:1102794422506238103>"
		},
		{
			name: "Akashic Magician",
			arrows: [LinkArrow.Top, LinkArrow.Bottom],
			emoji: "<:LinkMarker_LeftMiddle_82:1102794545877483610><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "Salamangreat Sunlight Wolf",
			arrows: [LinkArrow.Bottom, LinkArrow.Top],
			emoji: "<:LinkMarker_LeftMiddle_82:1102794545877483610><:LinkMarker_Right_0:1102794415149432992>"
		},
		{
			name: "I:P Masquerena",
			arrows: [LinkArrow["Bottom-Left"], LinkArrow["Bottom-Right"]],
			emoji: "<:LinkMarker_LeftMiddle_1:1102794512960589895><:LinkMarker_Right_3:1102794418290958336>"
		},
		{
			name: "Crystron Halqifibrax",
			arrows: [LinkArrow["Bottom-Right"], LinkArrow["Bottom-Left"]],
			emoji: "<:LinkMarker_LeftMiddle_1:1102794512960589895><:LinkMarker_Right_3:1102794418290958336>"
		},
		{
			name: "S:P Little Knight",
			arrows: [LinkArrow.Left, LinkArrow.Right],
			emoji: "<:LinkMarker_LeftMiddle_4:1102794519281405963><:LinkMarker_Right_6:1102794419855429672>"
		},
		{
			name: "Knightmare Goblin",
			arrows: [LinkArrow.Right, LinkArrow.Left],
			emoji: "<:LinkMarker_LeftMiddle_4:1102794519281405963><:LinkMarker_Right_6:1102794419855429672>"
		},
		{
			name: "Geonator Transverser",
			arrows: [LinkArrow["Bottom-Left"], LinkArrow["Top-Right"]],
			emoji: "<:LinkMarker_LeftMiddle_1:1102794512960589895><:LinkMarker_Right_9:1102794422506238103>"
		},
		{
			name: "Pitknight Earlie",
			arrows: [LinkArrow.Right, LinkArrow["Top-Right"]],
			emoji: "<:LinkMarker_LeftMiddle_0:1102794510444011581><:LinkMarker_Right_96:1102794428445368360>"
		},
		{
			name: "Summon Sorceress",
			arrows: [LinkArrow.Top, LinkArrow["Bottom-Left"], LinkArrow["Bottom-Right"]],
			emoji: "<:LinkMarker_LeftMiddle_81:1102794541859356763><:LinkMarker_Right_3:1102794418290958336>"
		},
		{
			name: "Decode Talker",
			arrows: [LinkArrow["Bottom-Right"], LinkArrow["Bottom-Left"], LinkArrow.Top],
			emoji: "<:LinkMarker_LeftMiddle_81:1102794541859356763><:LinkMarker_Right_3:1102794418290958336>"
		},
		{
			name: "Knightmare Unicorn",
			arrows: [LinkArrow.Left, LinkArrow.Bottom, LinkArrow.Right],
			emoji: "<:LinkMarker_LeftMiddle_42:1102794530643771505><:LinkMarker_Right_6:1102794419855429672>"
		},
		{
			name: "Promethean Princess, Bestower of Flames",
			arrows: [LinkArrow.Bottom, LinkArrow.Right, LinkArrow.Left],
			emoji: "<:LinkMarker_LeftMiddle_42:1102794530643771505><:LinkMarker_Right_6:1102794419855429672>"
		},
		{
			name: "S-Force Justify",
			arrows: [LinkArrow["Top-Left"], LinkArrow.Top, LinkArrow["Top-Right"]],
			emoji: "<:LinkMarker_LeftMiddle_78:1102794539799945266><:LinkMarker_Right_9:1102794422506238103>"
		},
		{
			name: "Firewall Dragon",
			arrows: [LinkArrow.Right, LinkArrow.Bottom, LinkArrow.Left, LinkArrow.Top],
			emoji: "<:LinkMarker_LeftMiddle_842:1102796164748820550><:LinkMarker_Right_6:1102794419855429672>"
		},
		{
			name: "Borrelguard Dragon",
			arrows: [LinkArrow.Bottom, LinkArrow.Right, LinkArrow["Bottom-Right"], LinkArrow.Top],
			emoji: "<:LinkMarker_LeftMiddle_82:1102794545877483610><:LinkMarker_Right_63:1102794424213323776>"
		},
		{
			name: "Topologic Zeroboros",
			arrows: [
				LinkArrow["Top-Left"],
				LinkArrow["Bottom-Left"],
				LinkArrow["Bottom-Right"],
				LinkArrow["Top-Right"]
			],
			emoji: "<:LinkMarker_LeftMiddle_71:1102794532355055687><:LinkMarker_Right_93:1102794426994147338>"
		},
		{
			name: "Firewall Dragon Darkfluid",
			arrows: [
				LinkArrow.Top,
				LinkArrow.Left,
				LinkArrow.Right,
				LinkArrow["Bottom-Left"],
				LinkArrow["Bottom-Right"]
			],
			emoji: "<:LinkMarker_LeftMiddle_841:1102796162228035634><:LinkMarker_Right_63:1102794424213323776>"
		},
		{
			name: "Underworld Goddess of the Closed World",
			arrows: [
				LinkArrow.Bottom,
				LinkArrow.Right,
				LinkArrow["Bottom-Right"],
				LinkArrow.Top,
				LinkArrow["Top-Right"]
			],
			emoji: "<:LinkMarker_LeftMiddle_82:1102794545877483610><:LinkMarker_Right_963:1102794429510733835>"
		},
		{
			name: "The Arrival Cyberse @Ignister",
			arrows: [
				LinkArrow.Right,
				LinkArrow["Bottom-Right"],
				LinkArrow.Bottom,
				LinkArrow["Bottom-Left"],
				LinkArrow.Left,
				LinkArrow.Top
			],
			emoji: "<:LinkMarker_LeftMiddle_8412:1102796165872898110><:LinkMarker_Right_63:1102794424213323776>"
		},
		{
			name: "Firewall Dragon Singularity",
			arrows: [
				LinkArrow.Left,
				LinkArrow["Top-Left"],
				LinkArrow.Top,
				LinkArrow["Top-Right"],
				LinkArrow.Right,
				LinkArrow.Bottom
			],
			emoji: "<:LinkMarker_LeftMiddle_7842:1102794580648276069><:LinkMarker_Right_96:1102794428445368360>"
		}
	])("LINK-$arrows.length: $name", ({ arrows, emoji }) => {
		expect(linkArrowsEmoji(arrows)).toBe(emoji);
	});
});
