import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

const api = new REST().setToken(process.env.DISCORD_TOKEN);
const application = await api.get(Routes.currentApplication());
console.log(JSON.stringify(application, null, 4));
