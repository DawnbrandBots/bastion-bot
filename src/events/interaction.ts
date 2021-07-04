import { Debugger } from "debug";
import { Interaction } from "discord.js";
import { Listener } from ".";
import { Command } from "../Command";
import { serializeCommand } from "../utils";

export class InteractionListener implements Listener<"interaction"> {
    private commands: Map<string, Command>;

    constructor(private log: Debugger, commands: Command[]) {
        this.commands = new Map();
        for (const command of commands) {
            this.commands.set(command.meta.name, command);
            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }
        }
    }

    async run(interaction: Interaction): Promise<void> {
        if (!interaction.isCommand()) {
            return;
        }
        this.log(serializeCommand(interaction));
        await this.commands.get(interaction.commandName)?.run(interaction);
    }
}
