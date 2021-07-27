import { ApplicationCommandData, Client, ClientApplication, Guild, Snowflake } from "discord.js";
import { HelpCommand } from "./help";
import { PingCommand } from "./ping";

export const classes = [HelpCommand, PingCommand];
export { HelpCommand, PingCommand };

interface LoggableCommandMetadata {
    id: Snowflake;
    name: string;
    description: string;
}

async function deployCommands(
    api: Guild | ClientApplication,
    commands: ApplicationCommandData[]
): Promise<LoggableCommandMetadata[]> {
    await api.commands.set(commands);
    const created = await api.commands.fetch();
    return created.map(command => ({
        id: command.id,
        name: command.name,
        description: command.description
    }));
}

// Register Slash Commands on CI
// Specify the guild snowflake to instantly deploy commands on the specified server.
// Otherwise, global commands can take up to an hour to roll out.
export async function registerSlashCommands(guild?: `${bigint}`): Promise<void> {
    // Duplicate command metadata if they register any aliases
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
    console.log("Generated command metadata:");
    console.log(commands);
    // Create a client object just to interact with the API
    const client = new Client({ intents: [] });
    // Because we're not using the object as intended to log into the gateway, we must manually
    // create this object so that we can use its interface to call the Discord Slash Commands API
    client.application = new ClientApplication(client, {});
    // Implicitly use DISCORD_TOKEN
    const application = await client.application.fetch();
    console.log(application.id);
    console.log(application.name);
    console.log(application.description);
    // Server commands deploy instantly, but global commands may take up to an hour to roll out
    const created =
        guild === undefined
            ? await deployCommands(application, commands)
            : await deployCommands(await client.guilds.fetch(guild), commands);
    console.log("Created Slash Commands:");
    console.log(created);
}
