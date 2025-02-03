# Bastion [<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" align="right" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.png" alt="Bastion avatar" align="right" />](https://yugipedia.com/wiki/Bastion_Misawa)

[![English](https://img.shields.io/badge/English-violet)](/README.md "current language")
[![한국어](https://img.shields.io/badge/한국어-grey)](/translations/README.ko.md "WIP")
[![日本語](https://img.shields.io/badge/日本語-blue)](/translations/README.ja.md)
[![简体中文](https://img.shields.io/badge/简体中文-grey)](/translations/README.zh-CN.md "WIP")
[![繁體中文](https://img.shields.io/badge/繁體中文-grey)](/translations/README.zh-TW.md "WIP")
[![Português](https://img.shields.io/badge/Português-grey)](/translations/README.pt.md  "WIP")
[![Español](https://img.shields.io/badge/Español-grey)](/translations/README.es.md "WIP")
[![Français](https://img.shields.io/badge/Français-grey)](/translations/README.fr.md "WIP")
[![Deutsch](https://img.shields.io/badge/Deutsch-grey)](/translations/README.de.md "WIP")
[![Italiano](https://img.shields.io/badge/Italiano-grey)](/translations/README.it.md "WIP")

A free and open-source Discord bot for looking up cards and other useful information about the
_Yu-Gi-Oh! Trading Card Game_, _Official Card Game_, _Rush Duel_, and _Master Duel_ video game.

**[Get started with searching for cards using `<>` in your messages!](/docs/card-search.md)**
For Slash Command documentation, look in [`docs/commands`](/docs/commands).
For everything else, please refer to the old [Bastion Classic](https://github.com/AlphaKretin/bastion-bot) repository.

Thanks to [YGOPRODECK](https://ygoprodeck.com/) for sponsoring Bastion. Prices provided by Bastion are YGOPRODECK affiliate links.

Card images and most card data are sourced from [Yugipedia](https://yugipedia.com/) via [YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi).

[<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
&nbsp;
[<img src="https://img.shields.io/badge/App%20Directory-darkgreen?style=for-the-badge" alt="Discord App Directory" />](https://discord.com/application-directory/383854640694820865)

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

[![codecov](https://codecov.io/gh/DawnbrandBots/bastion-bot/graph/badge.svg?token=17Z5J4SB5B)](https://codecov.io/gh/DawnbrandBots/bastion-bot)
[![Continuous integration and deployment](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/cicd.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/cicd.yml)
[![CodeQL](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/codeql-analysis.yml)
[![Contract tests](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.contract.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.contract.yml)

Bastion is written in [TypeScript](https://www.typescriptlang.org/).
It targets [Node.js](https://nodejs.org/) 20+ and
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

Copyright © 2021–2025 Luna Brand, Kevin Lu.
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
