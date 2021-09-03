# Bastion [<img src="https://img.shields.io/static/v1?label=invite%20to&message=Discord&color=informational&style=for-the-badge" alt="Invite to Discord" align="right" />](https://discordapp.com/oauth2/authorize?client_id=383854640694820865&scope=bot&permissions=378944)

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.png" alt="Bastion avatar" align="right" />](https://yugipedia.com/wiki/Bastion_Misawa)

A free and open-source Discord bot for looking up cards and other useful information about the
_Yu-Gi-Oh! Trading Card Game_ and _Official Card Game_. This is the repository for the rewrite
to take advantage of new features offered by Discord and improve reliability.

Features implemented here will be gradually rolled out to the live bot. For documentation, please
refer to the old [Bastion Classic](https://github.com/AlphaKretin/bastion-bot) repository.

## Discord permissions

Please make sure you use an [invite link](https://discordapp.com/oauth2/authorize?client_id=383854640694820865&scope=bot&permissions=378944) that automatically grants the following permissions.

- Send Messages
- Embed Links: Bastion displays card information in a Discord rich embed.
- Attach Files: Bastion attaches card images for trivia.
- Read Message History
- Use External Emojis: Bastion ues certain emojis for Yu-Gi-Oh icons in its embeds.
- Add Reactions: Bastion uses "reaction buttons" for advanced control of outputs.

If you do not want Bastion to be used in a channel, deny it the View Channel permission.
Otherwise, all of the above permissions must be granted to Bastion in each channel it is
available in for it to work correctly.

## Support server

[![Support server invite](https://discordapp.com/api/guilds/381294999729340417/widget.png?style=banner3)](https://discord.gg/4aFuPyuE96)

## Roadmap and contributing

Bastion is written in TypeScript. It targets Node.js 16.6+ and can be run with or without Docker.
It uses Discord.js to talk to Discord.

Please use Australian English spellings.

## Licence

Copyright © 2021 Luna Brand, Kevin Lu.
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
