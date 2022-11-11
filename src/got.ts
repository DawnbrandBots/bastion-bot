import got, { Got } from "got";
import { version } from "got/package.json";

export default function createGotClient(): Got {
	// No cache for now because it has potentially unbounded memory use
	return got.extend({
		http2: true,
		headers: {
			"User-Agent": `Bastion/${process.env.BOT_REVISION} (https://github.com/DawnbrandBots/bastion-bot) got/${version} (https://github.com/sindresorhus/got)`
		},
		timeout: 2500, // Discord interactions must be responded to within three seconds
		retry: {
			limit: 0
		}
	});
}
