import got from "got";
import { createFetch } from "got-fetch/out/lib";

const cache = new Map();

const gotClient = got.extend({
	cache,
	http2: true
});

const fetch = createFetch(gotClient);
export default fetch;
