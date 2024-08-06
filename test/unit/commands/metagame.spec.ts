import { createCardUsageEmbed, createTopStrategiesEmbed, TopCardsResponse } from "../../../src/commands/metagame";
import tcgCardUsage from "./metagame.card-usage.tcg.json";
import emptyStrategies from "./metagame.strategies.empty.json";
import ocgStrategies from "./metagame.strategies.ocg.json";
import tcgStrategies from "./metagame.strategies.tcg.json";

describe("/metagame cards", () => {
	test("createTopStrategiesEmbed TCG", () => {
		expect(createTopStrategiesEmbed(tcgStrategies)).toMatchSnapshot();
	});
	test("createTopStrategiesEmbed OCG", () => {
		expect(createTopStrategiesEmbed(ocgStrategies)).toMatchSnapshot();
	});
	test("createTopStrategiesEmbed no data", () => {
		expect(createTopStrategiesEmbed(emptyStrategies)).toMatchSnapshot();
	});
	test("createCardUsageEmbed", () => {
		expect(createCardUsageEmbed(tcgCardUsage as TopCardsResponse).toJSON()).toMatchSnapshot();
	});
});
