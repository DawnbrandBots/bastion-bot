import debug from "debug";
import { Got } from "got";
import MIMEType from "whatwg-mimetype";
import { LinkCommand } from "../../src/commands/link";
import createGotClient from "../../src/got";

describe("Healthcheck for /link URLs", () => {
	let got: Got;

	beforeAll(() => {
		debug.enable("bot:*");
		got = createGotClient();
	});

	// Skip Discord CDN links as they are no longer accessible outside Discord after the Authenticated Attachment URL change
	test.each(
		Object.values(LinkCommand.links).filter(({ result }) => !result.startsWith("https://cdn.discordapp.com/"))
	)("$name", async ({ result }) => {
		for (const url of result.split("\n")) {
			const response = await got(url);
			expect(response.statusCode).toBe(200);
			expect(response.headers["content-type"]).toBeDefined();
			const mimeType = new MIMEType(response.headers["content-type"]!);
			if (url.endsWith(".png")) {
				expect(mimeType.essence).toBe("image/png");
			} else if (url.endsWith(".jpg")) {
				expect(mimeType.essence).toBe("image/jpeg");
			} else if (url.endsWith(".pdf")) {
				expect(mimeType.essence).toBe("application/pdf");
			} else {
				expect(mimeType.isHTML()).toBe(true);
			}
		}
	});
});
