import debug, { Debug } from "debug";
import fetch, { FetchError, Request } from "node-fetch";
import util from "util";

const global = debug("bot");

function withWebhook(log: debug.Debugger): Debug["log"] {
    if (process.env.BOT_LOGGER_WEBHOOK) {
        return function (...args: Parameters<debug.Debugger>) {
            log(...args);
            const request = new Request(`${process.env.BOT_LOGGER_WEBHOOK}?wait=true`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: log.namespace,
                    content: util.format(...args)
                })
            });
            fetch(request)
                .then(async response => {
                    if (!response.ok) {
                        log(`Failed to notify webhook, retrying... ${response.status}: ${await response.text()}`);
                        throw new Error();
                    }
                })
                .catch(error => {
                    if (error instanceof FetchError) {
                        log("Failed to notify webhook, retrying...", error);
                    }
                    fetch(request)
                        .then(async response => {
                            if (!response.ok) {
                                log(`${response.status} ${response.statusText}: ${await response.text()}`);
                            }
                        })
                        .catch(error => log(error));
                });
        };
    } else {
        return log;
    }
}

export interface Logger {
    error: Debug["log"];
    warn: Debug["log"];
    notify: Debug["log"];
    info: Debug["log"];
    verbose: Debug["log"];
}

export function getLogger(namespace: string): Logger {
    return {
        error: withWebhook(global.extend(`error:${namespace}`)),
        warn: withWebhook(global.extend(`warn:${namespace}`)),
        notify: withWebhook(global.extend(`notify:${namespace}`)),
        info: global.extend(`info:${namespace}`),
        verbose: global.extend(`verbose:${namespace}`)
    };
}
