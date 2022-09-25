import { cleanMessageMarkup, preprocess } from "../../src/events/message-search";

describe("clean markup", () => {
	test("cleans > blockQuote", () => {
		const message = cleanMessageMarkup("foo\n> bar");
		expect(message.trim()).toBe("foo");
	});
	test("cleans >>> blockQuote", () => {
		const message = cleanMessageMarkup("foo\n>>> bar");
		expect(message.trim()).toBe("foo");
	});
	test("cleans ```", () => {
		const message = cleanMessageMarkup("```\nfoo\n```\nbar");
		expect(message.trim()).toBe("bar");
	});
	test("cleans `", () => {
		const message = cleanMessageMarkup("`foo`bar");
		expect(message.trim()).toBe("bar");
	});
	test("does not clean escaped `", () => {
		const message = cleanMessageMarkup("\\`foo\\`bar");
		expect(message.trim()).toBe("`foo`bar");
	});
	test("cleans ||", () => {
		const message = cleanMessageMarkup("foo || bar ||");
		expect(message.trim()).toBe("foo");
	});
	test("does not clean escaped ||", () => {
		const message = cleanMessageMarkup("foo \\|| bar ||");
		expect(message.trim()).toBe("foo || bar ||");
	});
	test("prunes user mention", () => {
		const message = cleanMessageMarkup("<@80351110224678912>");
		expect(message.trim()).toBe("");
	});
	test("prunes nicknamed user mention", () => {
		const message = cleanMessageMarkup("<@!80351110224678912>");
		expect(message.trim()).toBe("");
	});
	test("prunes channel mention", () => {
		const message = cleanMessageMarkup("<#103735883630395392>");
		expect(message.trim()).toBe("");
	});
	test("prunes role mention", () => {
		const message = cleanMessageMarkup("<@&165511591545143296>");
		expect(message.trim()).toBe("");
	});
	test("prunes slash command mention", () => {
		const message = cleanMessageMarkup("</airhorn:816437322781949972>");
		expect(message.trim()).toBe("");
	});
	test("prunes emoji", () => {
		const message = cleanMessageMarkup("<:mmLol:216154654256398347>");
		expect(message.trim()).toBe("");
	});
	test("prunes animated emoji", () => {
		const message = cleanMessageMarkup("<a:b1nzy:392938283556143104>");
		expect(message.trim()).toBe("");
	});
	test("prunes timestamp", () => {
		const message = cleanMessageMarkup("<t:1618953630>");
		expect(message.trim()).toBe("");
	});
	test("prunes formatted timestamp", () => {
		const message = cleanMessageMarkup("<t:1618953630:d>");
		expect(message.trim()).toBe("");
	});
});

describe("preprocess message to get inputs", () => {
	test("skips doubled delimiters", () => {
		const inputs = preprocess("<<test>>");
		expect(inputs.length).toBe(0);
	});
	test("gets one", () => {
		const inputs = preprocess("<test>");
		expect(inputs).toEqual(["test"]);
	});
	test("clears whitespace", () => {
		const inputs = preprocess("< test >");
		expect(inputs).toEqual(["test"]);
	});
	test("gets multiple", () => {
		const inputs = preprocess("<foo> <bar>");
		expect(inputs).toEqual(["foo", "bar"]);
	});
	test("ignores hyperlinks", () => {
		const inputs = preprocess("<https://www.example.net>");
		expect(inputs.length).toBe(0);
	});
	test("ignores parentheses", () => {
		const inputs = preprocess("<Burning Soul (manga)>");
		expect(inputs.length).toBe(0);
	});
	test("ignores anime", () => {
		const inputs = preprocess("<winged dragon of ra anime>");
		expect(inputs.length).toBe(0);
	});
	test("ignores anime in other casings", () => {
		const inputs = preprocess("<C/C/C Critical Eye ANIME>");
		expect(inputs.length).toBe(0);
	});
	test("the kitchen sink", () => {
		const inputs = preprocess(
			"<#12345678901234567> <@!12345678901234567> <big test> <<missed>> < nibiru> <@&12345678901234567> :thonk: <t:1664136104811>\n`<miss>`\n\\`<eternity>`\n<tearlaments\n        lulucaros>\n|| <dark magician> ||\n<dark dragoon >>\n```\n<code talker>\n```\n> <majesty's fiend>"
		);
		expect(inputs).toEqual(["big test", "nibiru", "eternity", "dark dragoon"]);
	});
});
