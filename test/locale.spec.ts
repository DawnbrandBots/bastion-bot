import { classes } from "../src/commands";
import { COMMAND_LOCALIZATIONS, loadTranslations } from "../src/locale";

describe(".po files", () => {
	test("syntax is valid", () => {
		// loadTranslations is the main test. If the file syntax is invalid, it will throw an exception.
		const locales = loadTranslations();
		// Check that we actually loaded a directory with files that we expect.
		expect(locales.length).toBe(COMMAND_LOCALIZATIONS.length);
		for (const locale of COMMAND_LOCALIZATIONS.map(l => l.gettext)) {
			expect(locales).toContain(locale);
		}
	});
	test("command metadata is valid", () => {
		// Side effect: loads globally. Do it here anyway so this test is guaranteed to work regardless
		// of execution order and stands independently.
		loadTranslations();
		const commands = classes.map(command => command.meta);
		// If translations and command metadata are set up correctly, some of the localisations provided
		// to Discord should be different and therefore not the default English values in the code.
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
