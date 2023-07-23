# Bastion [<img src="https://img.shields.io/static/v1?label=invite%20to&message=Discord&color=informational&style=for-the-badge" alt="Invite to Discord" align="right" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.png" alt="Bastion avatar" align="right" />](https://yugipedia.com/wiki/Bastion_Misawa)

A free and open-source Discord bot for looking up cards and other useful information about the
_Yu-Gi-Oh! Trading Card Game_ and _Official Card Game_. This is the repository for the new instance
to take advantage of new features offered by Discord and improve reliability.

The new instance runs concurrently with the old instance.
Features implemented here will be gradually rolled out to the live bot.
**New `<>` card search documentation is [here](/docs/card-search.md).**
For Slash Command documentation, look in [`docs/commands`](/docs/commands).
For everything else, please refer to the old [Bastion Classic](https://github.com/AlphaKretin/bastion-bot) repository.

Thanks to [YGOPRODECK](https://ygoprodeck.com/) for sponsoring Bastion. Prices provided by Bastion are YGOPRODECK affiliate links.

[![Compile and test](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.yml)
[![Build Docker image and deploy to Swarm](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/docker.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/docker.yml)
[![Release to production (Compose)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/release-compose.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/release-compose.yml)
[![CodeQL](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/codeql-analysis.yml)

## Discord permissions

Please make sure you use an [invite link](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
that automatically grants the following permissions.

- Create commands in a server
- Send Messages
- Send Messages in Threads
- Embed Links: Bastion displays card information in a Discord rich embed.
- Attach Files: Bastion attaches card images for trivia.
- Read Message History: Bastion replies to messages that request card search.
- Use External Emojis: Bastion uses certain emojis for Yu-Gi-Oh icons in its embeds.
- Add Reactions: Bastion uses "reaction buttons" for advanced control of outputs.

If you do not want Bastion to be used in a channel, deny it the View Channel permission.
Otherwise, all of the above permissions **must** be granted to Bastion in each channel it is
available in for it to work correctly.

If you do not want Slash Commands to be used in a channel, this can be managed per command in the Integrations tab of
your server settings. Alternatively, you can blanket deny the Use Application Commands permission for the individuals
or roles in question, but this will apply to all bots.

## Support server

[![Support server invite](https://discordapp.com/api/guilds/381294999729340417/widget.png?style=banner3)](https://discord.gg/4aFuPyuE96)

## Contributing

Bastion is written in [TypeScript](https://www.typescriptlang.org/).
It targets [Node.js](https://nodejs.org/) 18+ and
can be run with or without [Docker](https://docs.docker.com/get-docker/).
It uses [Discord.js](https://discord.js.org/) to talk to Discord.

Please use Australian English spellings.

### Translations

Bastion intends to be fully localised to all regions with official Yu-Gi-Oh! releases.
Translation work is _incomplete_ and we appreciate any translator help. The localisation
files are in the [`translations`](/translations) directory; for more information,
please see the [documentation for translators](/docs/translations.md).

## Privacy

See [PRIVACY.md](https://github.com/DawnbrandBots/bastion-bot/blob/master/PRIVACY.md) for Bastion's Privacy Policy.

## Licence

Copyright © 2021–2023 Luna Brand, Kevin Lu.
See [COPYING](https://github.com/DawnbrandBots/bastion-bot/blob/master/COPYING) for more details.

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
