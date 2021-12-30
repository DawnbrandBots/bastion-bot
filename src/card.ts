import { Static } from "@sinclair/typebox";
import { MessageEmbed } from "discord.js";
import { CardSchema } from "./definitions";

const colours = {
	"0x4000": 0x8d8693,
	"0x2": 0x1d9e74,
	"0x4": 0xbc5a84,
	"0x40": 0xa086b7,
	"0x80": 0x6699ff,
	"0x2000": 0xe8e8e6,
	"0x800000": 0x2d2f33,
	"0x4000000": 0x1f11b2,
	"0x8000000": 0x4287f5,
	"0x10": 0xfde68a,
	"0x20": 0xff8b53
};

const icons = {
	race: {
		"0x1": "<:Warrior:602707927224025118>",
		"0x2": "<:Spellcaster:602707926834085888>",
		"0x4": "<:Fairy:602707926200614912>",
		"0x8": "<:Fiend:602707926850732035>",
		"0x10": "<:Zombie:602707927102390292>",
		"0x20": "<:Machine:602707926733291521>",
		"0x40": "<:Aqua:602707887931785238>",
		"0x80": "<:Pyro:602707925793767427>",
		"0x100": "<:Rock:602707926213460010>",
		"0x200": "<:WingedBeast:602707926464987138>",
		"0x400": "<:Plant:602707792138076186>",
		"0x800": "<:Insect:602707926146088960>",
		"0x1000": "<:Thunder:602707927484203013>",
		"0x2000": "<:Dragon:602707926901325834>",
		"0x4000": "<:Beast:602707889018372109>",
		"0x8000": "<:BeastWarrior:602707890171543593>",
		"0x10000": "<:Dinosaur:602713887141527563>",
		"0x20000": "<:Fish:602707925877915659>",
		"0x40000": "<:SeaSerpent:602707926288826378>",
		"0x80000": "<:Reptile:602707927219830784>",
		"0x100000": "<:Psychic:602707926767108129>",
		"0x200000": "<:DivineBeast:602707925730852874>",
		"0x400000": "<:CreatorGod:602707927219961866>",
		"0x800000": "<:Wyrm:602707927068835884>",
		"0x1000000": "<:Cyberse:602707927421157376>",
		"0x80000000": "<:Yokai:602707927932993546>",
		"0x100000000": "<:Charisma:602707891530629130>"
	},
	attribute: {
		"0x1": "<:EARTH:602707925726658570>",
		"0x2": "<:WATER:602707927341596691>",
		"0x4": "<:FIRE:602707928255954963>",
		"0x8": "<:WIND:602707926771171348>",
		"0x10": "<:LIGHT:602707926183968768>",
		"0x20": "<:DARK:602707926792273920>",
		"0x40": "<:DIVINE:602707926594879498>",
		"0x80": "<:LAUGH:602719132567207938>"
	},
	type: {
		"0x2": "<:SPELL:623021653580054538>",
		"0x4": "<:TRAP:623021653810741258> ",
		"0x80": "<:Ritual:602707927274487838>",
		"0x10000": "<:QuickPlay:602707927073030150> ",
		"0x20000": "<:Continuous:602707892507770891>",
		"0x40000": "<:Equip:602707925886042119> ",
		"0x80000": "<:FIELD:602707926834216963> ",
		"0x100000": "<:Counter:602707928075599872>",
		"0x4000000": "<:LinkSpell:602707598164099104>"
	},
	misc: {
		scaleLeft: "<:ScaleLeft:602710168337121290>",
		scaleRight: "<:ScaleRight:602710170430210048>",
		level: "<:level:602707925949087760>",
		rank: "<:rank:602707927114973185>"
	}
};

export function embed(card: Static<typeof CardSchema>): MessageEmbed {
	return new MessageEmbed()
		.setColor(colours["0x10"])
		.setTitle(card.name)
		.setURL("hyperlink")
		.setDescription("stats with hyperlinks")
		.setThumbnail("https://pic")
		.setFooter("password+KID")
		.addField("Pendulum", "text")
		.addField("Flavour", "text")
		.addField("Patreon", "help support us random");
}
