import { cleanMessageMarkup, inputToGetCardArguments, preprocess } from "../../../src/events/message-search";

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
	function expectDistinct(inputs: ReturnType<typeof preprocess>): void {
		expect(new Set(inputs.map(input => input.hashCode())).size).toBe(inputs.length);
		const [first, ...rest] = inputs;
		for (const input of rest) {
			expect(input.equals(first)).toBe(false);
		}
	}

	test("skips doubled delimiters", () => {
		const inputs = preprocess("<<test>>");
		expect(inputs.length).toBe(0);
	});
	test("gets one", () => {
		const inputs = preprocess("<test>");
		expect(inputs).toEqual([expect.objectContaining({ summon: "test", type: "ocg" })]);
		expect(inputs[0].equals({ summon: "test", type: "ocg" })).toBe(false);
	});
	test("clears whitespace", () => {
		const inputs = preprocess("< test >");
		expect(inputs).toEqual([expect.objectContaining({ summon: "test", type: "ocg" })]);
	});
	test("gets multiple", () => {
		const inputs = preprocess("<foo> <bar>");
		expect(inputs).toEqual([
			expect.objectContaining({ summon: "foo", type: "ocg" }),
			expect.objectContaining({ summon: "bar", type: "ocg" })
		]);
		expectDistinct(inputs);
	});
	test("gets identical", () => {
		const inputs = preprocess("< abc > <abc>");
		expect(inputs).toEqual([
			expect.objectContaining({ summon: "abc", type: "ocg" }),
			expect.objectContaining({ summon: "abc", type: "ocg" })
		]);
		expect(inputs[0].equals(inputs[1])).toBe(true);
		expect(inputs[0].original).not.toEqual(inputs[1].original);
		expect(inputs[0].index).toBe(0);
		expect(inputs[1].index).toBe(8);
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
	test("ignores blanks", () => {
		const inputs = preprocess("<> r<>");
		expect(inputs.length).toBe(0);
	});
	test("ignores long attempts", () => {
		const inputs = preprocess(
			"<qwertyuiopasdfghjklzxcvbnm1234567890 qwertyuiopasdfghjklzxcvbnm1234567890 `-=[]|;,./>"
		);
		expect(inputs.length).toBe(0);
	});
	test("the kitchen sink", () => {
		const inputs = preprocess(
			"<#12345678901234567> <@!12345678901234567> <big test> <<missed>> < nibiru> <@&12345678901234567> :thonk: <t:1664136104811>\n`<miss>`\n\\`<eternity>`\n<tearlaments\n        lulucaros>\n|| <dark magician> ||\n<dark dragoon >>\n```\n<code talker>\n```\n> <majesty's fiend>"
		);
		expect(inputs).toEqual([
			expect.objectContaining({ summon: "big test", type: "ocg" }),
			expect.objectContaining({ summon: "nibiru", type: "ocg" }),
			expect.objectContaining({ summon: "eternity", type: "ocg" }),
			expect.objectContaining({ summon: "dark dragoon", type: "ocg" })
		]);
		expectDistinct(inputs);
	});
	test.each([
		"r<test>",
		"<test>r",
		"R<test>",
		"<test>R",
		"r<test>r",
		"r<test>R",
		"R<test>R",
		"R<test>r",
		"러<test>",
		"<test>러"
	])("gets rush: %s", message => {
		const inputs = preprocess(message);
		expect(inputs).toEqual([expect.objectContaining({ summon: "test", type: "rush" })]);
	});
	test("gets joined rush", () => {
		const inputs = preprocess("<foo>r<bar>");
		expect(inputs).toEqual([
			expect.objectContaining({ summon: "foo", type: "rush" }),
			expect.objectContaining({ summon: "bar", type: "rush" })
		]);
		expectDistinct(inputs);
	});
	test("gets mixed", () => {
		const inputs = preprocess("<pot of greed> vs r<pot of greed>");
		expect(inputs).toEqual([
			expect.objectContaining({ summon: "pot of greed", type: "ocg" }),
			expect.objectContaining({ summon: "pot of greed", type: "rush" })
		]);
		expectDistinct(inputs);
	});
});

describe("transform input to arguments", () => {
	test("Konami ID", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("%4007", "ja");
		expect(resultLanguage).toBe("ja");
		expect(type).toBe("konami-id");
		expect(searchTerm).toBe("4007");
		expect(inputLanguage).toBeUndefined();
	});
	test("Konami ID with override language", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("%4007,en", "ja");
		expect(resultLanguage).toBe("en");
		expect(type).toBe("konami-id");
		expect(searchTerm).toBe("4007");
		expect(inputLanguage).toBeUndefined();
	});
	test("Konami ID with whitespace and override language", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("% 4007  ,en", "ja");
		expect(resultLanguage).toBe("en");
		expect(type).toBe("konami-id");
		expect(searchTerm).toBe("4007");
		expect(inputLanguage).toBeUndefined();
	});
	test("Password", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("00010000", "ja");
		expect(resultLanguage).toBe("ja");
		expect(type).toBe("password");
		expect(searchTerm).toBe("00010000");
		expect(inputLanguage).toBeUndefined();
	});
	test("Password with override language", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("00010000,zh-CN", "ja");
		expect(resultLanguage).toBe("zh-CN");
		expect(type).toBe("password");
		expect(searchTerm).toBe("00010000");
		expect(inputLanguage).toBeUndefined();
	});
	test("Card name", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("blue-eyes", "en");
		expect(resultLanguage).toBe("en");
		expect(type).toBe("name");
		expect(searchTerm).toBe("blue-eyes");
		expect(inputLanguage).toBe("en");
	});
	test("Card name starting with a number", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("7 colored fish", "en");
		expect(resultLanguage).toBe("en");
		expect(type).toBe("name");
		expect(searchTerm).toBe("7 colored fish");
		expect(inputLanguage).toBe("en");
	});
	test("Card name with input language", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("baguette,fr", "en");
		expect(resultLanguage).toBe("en");
		expect(type).toBe("name");
		expect(searchTerm).toBe("baguette");
		expect(inputLanguage).toBe("fr");
	});
	test("Card name with input and result language", () => {
		const [resultLanguage, type, searchTerm, inputLanguage] = inputToGetCardArguments("blue-eyes,en,ja", "fr");
		expect(resultLanguage).toBe("ja");
		expect(type).toBe("name");
		expect(searchTerm).toBe("blue-eyes");
		expect(inputLanguage).toBe("en");
	});
});
