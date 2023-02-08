import { classes } from "../src/commands";
import { COMMAND_LOCALIZATIONS, loadTranslations } from "../src/locale";

describe(".po files", () => {
	test("syntax is valid", () => {
		const locales = loadTranslations();
		expect(locales.length).toBe(COMMAND_LOCALIZATIONS.length);
		for (const locale of COMMAND_LOCALIZATIONS.map(l => l.gettext)) {
			expect(locales).toContain(locale);
		}
	});
	test("command metadata is valid", () => {
		loadTranslations();
		const commands = classes.map(command => command.meta);
		let translationsLoaded = false;
		for (const command of commands) {
			if (command.description_localizations?.ko !== command.description_localizations?.ja) {
				translationsLoaded = true;
				break;
			}
		}
		expect(translationsLoaded);
	});
});
