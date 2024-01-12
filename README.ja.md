<!-- # Bastion [<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" align="right" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands) -->
# 三沢大地 [<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" align="right" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.png" alt="Bastion avatar" align="right" />](https://yugipedia.com/wiki/Bastion_Misawa)

<!-- A free and open-source Discord bot for looking up cards and other useful information about the
_Yu-Gi-Oh! Trading Card Game_ and _Official Card Game_. This is the repository for the new instance
to take advantage of new features offered by Discord and improve reliability. -->
_Yu-Gi-Oh! Trading Card Game_ と「遊☆戯☆王オフィシャルカードゲーム」のカードや便利な情報を調べるための、自由でオープンソースなディスコード上のボットです。本リポジトリはディスコードに追加される新機能の活用や、ボット動作の信頼性向上を行うための新しいバージョンのためのリポジトリです。

<!-- The new instance runs concurrently with the old instance.
Features implemented here will be gradually rolled out to the live bot.
<!-- I didn't much understand what the instances (new and old ones) and the live bot mean-->
新版は旧版と同時に稼働しています。ここで導入された機能は実機へと順番に適用されていきます。

<!--**New `<>` card search documentation is [here](/docs/card-search.md).**
For Slash Command documentation, look in [`docs/commands`](/docs/commands).
For everything else, please refer to the old [Bastion Classic](https://github.com/AlphaKretin/bastion-bot) repository. -->
**`<>` での新しいカード検索の使い方は[こちら](/docs/card-search.md)です。**
スラッシュコマンドでのカード検索方法は、[`docs/commands`](/docs/commands)をご参照ください。
その他については旧版の[Bastionクラシック](https://github.com/AlphaKretin/bastion-bot)リポジトリを参照してください。


<!-- Thanks to [YGOPRODECK](https://ygoprodeck.com/) for sponsoring Bastion. Prices provided by Bastion are YGOPRODECK affiliate links.-->
本ボットは[YGOPRODECK](https://ygoprodeck.com/)の提供でお送りしています。価格情報はYGOPRODECKへのアフィリエイトリンクになっています。

[<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
&nbsp;
[<img src="https://img.shields.io/badge/App%20Directory-darkgreen?style=for-the-badge" alt="Discord App Directory" />](https://discord.com/application-directory/383854640694820865)

[![Compile and test](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.yml)
[![Build Docker image and deploy to Swarm](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/docker.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/docker.yml)
[![Release to production (Compose)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/release-compose.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/release-compose.yml)
[![CodeQL](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/codeql-analysis.yml)
[![Contract tests](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.contract.yml/badge.svg)](https://github.com/DawnbrandBots/bastion-bot/actions/workflows/node.js.contract.yml)

<!--## Discord permissions-->
## ディスコードでの権限

<!--Please make sure you use an [invite link](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
that automatically grants the following permissions.-->
以下の権限を与える設定になっている[招待リンク](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)を使ってください。

<!-- - Create commands in a server-->
<!-- 'Create commands' permission is asked when you select which server to add Bastion along with 'Add a bot to a server' permission. Others are asked later when you authorize them for a certain server you selected.-->
- コマンドを作成
<!-- - Send Messages-->
- メッセージを送信
<!-- - Send Messages in Threads-->
- スレッドでメッセージを送信
<!-- - Embed Links: Bastion displays card information in a Discord rich embed.-->
- 埋め込みリンク（カード情報を表現力豊かなディスコードの埋め込みリンク機能を使って表示します。）
<!-- - Attach Files: Bastion attaches card images for trivia.-->
- ファイルを添付（カード画像を添付することがあります。）
<!-- - Read Message History: Bastion replies to messages that request card search.-->
- メッセージ履歴を読む（カード検索のリクエストメッセージにリプライを飛ばします）
<!-- - Use External Emojis: Bastion uses certain emojis for Yu-Gi-Oh icons in its embeds.-->
- 外部の絵文字を使用する（埋め込みリンクの中で遊戯王のアイコンとして絵文字をいくつか使います）
<!-- - Add Reactions: Bastion uses "reaction buttons" for advanced control of outputs.-->
- リアクションの追加（リアクションボタンを出力のコントロールに使います）

<!-- If you do not want Bastion to be used in a channel, deny it the View Channel permission.
Otherwise, all of the above permissions **must** be granted to Bastion in each channel it is
available in for it to work correctly.-->
特定のチャンネルでのみ本ボットを使いたくない場合は、チャンネルの権限設定にて「チャンネルを見る」の権限を与えないようにしてください。
そうでない場合は、本ボットが正常に動作するには、上記のすべての権限が本ボットがアクセス可能なそれぞれのチャンネルにて許可**されなければなりません**。

If you do not want Slash Commands to be used in a channel, this can be managed per command in the Integrations tab of
your server settings. Alternatively, you can blanket deny the Use Application Commands permission for the individuals
or roles in question, but this will apply to all bots.

<!-- ## Support server-->
## サポートサーバー

[![Support server invite](https://discordapp.com/api/guilds/381294999729340417/widget.png?style=banner3)](https://discord.gg/4aFuPyuE96)

<!--## Contributing-->
## 貢献する

<!--Bastion is written in [TypeScript](https://www.typescriptlang.org/).
It targets [Node.js](https://nodejs.org/) 20+ and
can be run with or without [Docker](https://docs.docker.com/get-docker/).
It uses [Discord.js](https://discord.js.org/) to talk to Discord.-->
本ボットは[TypeScript](https://www.typescriptlang.org/)にて書かれています。
[Node.js](https://nodejs.org/) 20+で動作し、
[Docker](https://docs.docker.com/get-docker/)を使っても、あるいは使わなくても動かすことができます。
[Discord.js](https://discord.js.org/)を使ってディスコードと話しています。

<!--Please use Australian English spellings.-->
オーストラリア英語の綴りを用いて頂くようお願いいたします。

<!--### Translations-->
### 翻訳

<!-- Bastion intends to be fully localised to all regions with official Yu-Gi-Oh! releases.
Translation work is _incomplete_ and we appreciate any translator help. The localisation
files are in the [`translations`](/translations) directory; for more information,
please see the [documentation for translators](/docs/translations.md).-->
本ボットは公式でYu-Gi-Oh!が発売されているすべての地域に対して完全にローカライズされることを目指しています。
翻訳作業は _未完_ ですので、すべての翻訳サポートを感謝とともに受け付けております。ローカライゼーションに使われるファイルは[`translations`](/translations)ディレクトリにあります。詳しくは[documentation for translators](/docs/translations.md)をご覧ください。

<!-- ## Privacy -->
## プライバシー

<!-- See [PRIVACY.md](https://github.com/DawnbrandBots/bastion-bot/blob/master/PRIVACY.md) for Bastion's Privacy Policy.-->
本ボットのプライバシーポリシーについては[PRIVACY.md](https://github.com/DawnbrandBots/bastion-bot/blob/master/PRIVACY.md)をご覧ください。

<!--## Licence-->
## ライセンス

Copyright © 2021–2023 Luna Brand, Kevin Lu.
詳細については[COPYING](https://github.com/DawnbrandBots/bastion-bot/blob/master/COPYING)をご覧ください。

<!-- Inserted below to explain-->
<!-- The English paragraphs below is a [license notice of GNU Affero General Public License](https://www.gnu.org/licenses/gpl-howto.en.html#license-notices).-->
以下の英語の文章は[GNU Affero General Public Licenseのライセンス告知](https://www.gnu.org/licenses/gpl-howto.ja.html#license-notices)です。

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
