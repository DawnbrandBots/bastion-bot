import { Debugger } from "debug";
import { Interaction } from "discord.js";
import { Listener } from ".";
import { Command } from "../Command";

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
        this.log(
            JSON.stringify({
                channel: interaction.channel?.id,
                message: interaction.id,
                guild: interaction.guild?.id,
                author: interaction.user.id,
                id: interaction.commandID,
                command: interaction.commandName
            })
        );
        await this.commands.get(interaction.commandName)?.run(interaction);
    }
}
