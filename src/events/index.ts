import { ClientEvents } from "discord.js";

export interface Listener<K extends keyof ClientEvents> {
	readonly type: K;
	run(...args: ClientEvents[K]): Promise<void>;
}

export { InteractionListener } from "./interaction";
export { MessageDeleteListener } from "./message-delete";
export { PingMessageListener } from "./message-ping";
export { SearchMessageListener } from "./message-search";
export { CommandCacheReadyListener } from "./ready-commands";
