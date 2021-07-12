import { ClientEvents } from "discord.js";

export interface Listener<K extends keyof ClientEvents> {
    run(...args: ClientEvents[K]): Promise<void>;
}

export { InteractionListener } from "./interaction";
export { MessageListener } from "./message";
