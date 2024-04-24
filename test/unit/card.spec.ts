import { masterDuelIllustration, masterDuelIllustrationURL, thumbnail, yugipediaFileRedirect } from "../../src/card";
import { MasterDuelRarity } from "../../src/definitions";

describe("Helper functions", () => {
	test("yugipediaFileRedirect", () => {
		expect(yugipediaFileRedirect("BlazingCartesiatheVirtuous-MADU-JP-VG-artwork.png")).toEqual(
			"https://yugipedia.com/wiki/Special:Redirect/file/BlazingCartesiatheVirtuous-MADU-JP-VG-artwork.png?utm_source=bastion"
		);
	});
	test.each([
		{
			en: "Ghost Meets Girl - A Masterful Mayakashi Shiranui Saga",
			expected: "GhostMeetsGirlAMasterfulMayakashiShiranuiSaga-MADU-EN-VG-artwork.png"
		},
		{
			en: "Live☆Twin Ki-sikil",
			expected: "LiveTwinKisikil-MADU-EN-VG-artwork.png"
		},
		{
			en: "Evil★Twin Lil-la",
			expected: "EvilTwinLilla-MADU-EN-VG-artwork.png"
		},
		{
			en: "Number 81: Superdreadnought Rail Cannon Super Dora",
			expected: "Number81SuperdreadnoughtRailCannonSuperDora-MADU-EN-VG-artwork.png"
		},
		{
			en: "Danger!? Tsuchinoko",
			expected: "DangerTsuchinoko-MADU-EN-VG-artwork.png"
		}
	])("masterDuelIllustration returns $expected for: $en", ({ en, expected }) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mockCard = { name: { en } } as any;
		expect(masterDuelIllustration(mockCard)).toEqual(expected);
	});
	test("masterDuelIllustrationURL", () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mockCard = { name: { en: "Blue-Eyes White Dragon" } } as any;
		expect(masterDuelIllustrationURL(mockCard)).toEqual(
			"https://yugipedia.com/wiki/Special:Redirect/file/BlueEyesWhiteDragon-MADU-EN-VG-artwork.png?utm_source=bastion"
		);
	});
	test.each([
		{
			label: "master_duel_rarity",
			card: { master_duel_rarity: MasterDuelRarity.N, name: { en: "S:P Little Knight" } },
			expected: "https://yugipedia.com/wiki/Special:Redirect/file/SPLittleKnight-MADU-EN-VG-artwork.png?utm_source=bastion"
		},
		{
			label: "illustration and no master_duel_rarity",
			card: {
				images: [
					{
						illustration: "ElementalHEROAirNeos-LOD2-JP-VG-artwork.jpg",
						index: 1,
						image: "ElementalHEROAirNeos-STON-EN-UR-UE-Reprint.png"
					}
				]
			},
			expected: "https://yugipedia.com/wiki/Special:Redirect/file/ElementalHEROAirNeos-LOD2-JP-VG-artwork.jpg?utm_source=bastion"
		},
		{
			label: "no illustration and no master_duel_rarity",
			card: { images: [{ index: 1, image: "DiabellzetheOriginalSinkeeper-LEDE-EN-ScR-1E.png" }] },
			expected: "https://yugipedia.com/wiki/Special:Redirect/file/DiabellzetheOriginalSinkeeper-LEDE-EN-ScR-1E.png?utm_source=bastion"
		},
		{ label: "no images", card: {}, expected: null }
	])("thumbnail returns $expected for card with $label", ({ card, expected }) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(thumbnail(card as any)).toEqual(expected);
	});
});
