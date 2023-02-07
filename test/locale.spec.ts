import { loadTranslations } from "../src/locale";

describe(".po files", () => {
	test("syntax valid", () => {
		const locales = loadTranslations();
		expect(locales.length).toBeGreaterThan(0);
	});
});
