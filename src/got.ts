import got, { Got } from "got";
import { version } from "got/package.json";
import { Agent as HTTPAgent } from "http";
import { Agent as HTTPSAgent } from "https";

export default function createGotClient(): Got {
	// Cache should be managed by each use case
	// Cache x HTTP/2 is nonfunctional: https://github.com/sindresorhus/got/issues/1743
	return got.extend({
		// These are for HTTP/1.1
		agent: {
			// https://github.com/sindresorhus/got/issues/815 https://nodejs.org/api/http.html#http_class_http_agent
			http: new HTTPAgent({ keepAlive: true }),
			// https://nodejs.org/api/https.html#https_class_https_agent
			https: new HTTPSAgent({ keepAlive: true })
		},
		http2: true,
		headers: {
			"User-Agent": `Bastion/${process.env.BOT_REVISION} (https://github.com/DawnbrandBots/bastion-bot) got/${version} (https://github.com/sindresorhus/got) Node.js ${process.version}`
		},
		timeout: 2500, // Discord interactions must be responded to within three seconds
		throwHttpErrors: false,
		retry: {
			limit: 0
		}
	});
}
