import { debug } from "debug";
import { Client, ClientApplication } from "discord.js";
import { HelpCommand } from "./help";
import { PingCommand } from "./ping";

// Register the commands on CI
const classes = [HelpCommand, PingCommand];
const commands = classes
    .map(command =>
        command.aliases
            .map(alias => ({
                ...command.meta,
                name: alias,
                description: `Alias for \`${command.meta.name}\`. ${command.meta.description}`
            }))
            .concat(command.meta)
    )
    .flat();
debug.log(commands);
const client = new Client({ intents: [] });
client.application = new ClientApplication(client, {});
client.application.fetch().then(async application => {
    debug.log(application.id, application.name, application.description);
    // Implicitly use DISCORD_TOKEN
    const server = await client.guilds.fetch("381294999729340417");
    server.commands.set(commands);
    const created = await server.commands.fetch();
    debug.log(
        created.map(command => ({
            id: command.id,
            name: command.name,
            description: command.description
        }))
    );
});
