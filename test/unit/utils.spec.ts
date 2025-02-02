import { shouldExcludeIcons } from "../../src/utils";

describe("shouldExcludeIcons", () => {
	it.each([
		["to Bastion without user-install", false, { "0": "0" }],
		["to Bastion with user-install", false, { "0": "0", "1": "12345678901234567890" }],
		["in server without user-install", false, { "0": "987654321987654321" }],
		["in server with user-install", false, { "0": "987654321987654321", "1": "12345678901234567890" }],
		["user-install in other direct message or server without", true, { "1": "12345678901234567890" }]
	])("%s is %s", (_, expected, authorizingIntegrationOwners) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mockInteraction: any = { authorizingIntegrationOwners };
		expect(shouldExcludeIcons(mockInteraction)).toStrictEqual(expected);
	});
});
