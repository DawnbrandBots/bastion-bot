import { createCardUsageEmbed, TopCardsResponse } from "../../../src/commands/metagame";
import tcgCardUsage from "./metagame.card-usage.tcg.json";

describe("/metagame cards", () => {
	test("createCardUsageEmbed", () => {
		expect(createCardUsageEmbed(tcgCardUsage as TopCardsResponse).toJSON()).toMatchSnapshot();
	});
});
