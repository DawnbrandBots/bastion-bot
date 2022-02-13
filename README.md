# Bastion [<img src="https://img.shields.io/static/v1?label=invite%20to&message=Discord&color=informational&style=for-the-badge" alt="Invite to Discord" align="right" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.png" alt="Bastion avatar" align="right" />](https://yugipedia.com/wiki/Bastion_Misawa)

A free and open-source Discord bot for looking up cards and other useful information about the
_Yu-Gi-Oh! Trading Card Game_ and _Official Card Game_. This is the repository for the rewrite
to take advantage of new features offered by Discord and improve reliability.

Features implemented here will be gradually rolled out to the live bot. For documentation, please
refer to the old [Bastion Classic](https://github.com/AlphaKretin/bastion-bot) repository.

## Roadmap and rationale

Throughout 2021, Discord has introduced a number of new features at a faster pace than ever before,
including application interactions and threads. These require a major update to Bastion because the
old underlying library to work with Discord is not keeping pace with the new direction of Discord.
Furthermore, Discord is [enforcing the use of Slash Commands](https://support-dev.discord.com/hc/en-us/articles/4404772028055)
over traditional message-based commands for verified bots, effective April 2022.

We will apply for message content privileges to retain the inline `<>` card searching feature, but
the final arbiter for that feature will be Discord. In the meantime, we will progressively migrate
as many Bastion commands as possible to the new Slash Command system.

## Discord permissions

Please make sure you use an [invite link](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
that automatically grants the following permissions.

- Create slash commands. **If Bastion joined your server after March 22, 2021, and you did not use
the link above to invite it, you will need to reinvite with the above link.** You do not need to kick the bot.
- Send Messages
- Send Messages in Threads
- Embed Links: Bastion displays card information in a Discord rich embed.
- Attach Files: Bastion attaches card images for trivia.
- Read Message History
- Use External Emojis: Bastion ues certain emojis for Yu-Gi-Oh icons in its embeds.
- Add Reactions: Bastion uses "reaction buttons" for advanced control of outputs.

If you do not want Bastion to be used in a channel, deny it the View Channel permission.
Otherwise, all of the above permissions must be granted to Bastion in each channel it is
available in for it to work correctly.
If you do not want Slash Commands to be used in a channel, deny the Use Application Commands
permission for the individuals or roles in question.

## Support server

[![Support server invite](https://discordapp.com/api/guilds/381294999729340417/widget.png?style=banner3)](https://discord.gg/4aFuPyuE96)

## Contributing

Bastion is written in [TypeScript](https://www.typescriptlang.org/).
It targets [Node.js](https://nodejs.org/) 16.6+ and
can be run with or without [Docker](https://docs.docker.com/get-docker/).
It uses [Discord.js](https://discord.js.org/) to talk to Discord.

Please use Australian English spellings.

## Privacy

See [PRIVACY.md](https://github.com/DawnbrandBots/bastion-bot/blob/master/PRIVACY.md) for Bastion's Privacy Policy.

## Licence

Copyright © 2021–2022 Luna Brand, Kevin Lu.
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
