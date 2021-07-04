import { Debugger } from "debug";
import { ClientEvents } from "discord.js";

export type EventListenerFactory<T extends unknown[]> = (log: Debugger) => (...args: T) => Promise<void>;
export interface Listener<K extends keyof ClientEvents> {
    run(...args: ClientEvents[K]): Promise<void>;
}

export { InteractionListener } from "./interaction";
export { createMessageListener } from "./message";
