# 三沢大地 [<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" align="right" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)

<!-- Unfortunately, GitHub Markdown sanitizes style attributes, so we will have to use a deprecated HTML attribute. -->
[<img src="https://cdn.discordapp.com/avatars/383854640694820865/fab10204c193d0bc3d48169d11245a1a.png" alt="Bastion avatar" align="right" />](https://yugipedia.com/wiki/Bastion_Misawa)

[![English](https://img.shields.io/badge/English-blue)](/README.md)
[![한국어](https://img.shields.io/badge/한국어-grey)](/translations/README.ko.md "WIP")
[![日本語](https://img.shields.io/badge/日本語-violet)](/translations/README.ja.md "WIP, current language")
[![简体中文](https://img.shields.io/badge/简体中文-grey)](/translations/README.zh-CN.md "WIP")
[![繁體中文](https://img.shields.io/badge/繁體中文-grey)](/translations/README.zh-TW.md "WIP")
[![Português](https://img.shields.io/badge/Português-grey)](/translations/README.pt.md  "WIP")
[![Español](https://img.shields.io/badge/Español-grey)](/translations/README.es.md "WIP")
[![Français](https://img.shields.io/badge/Français-grey)](/translations/README.fr.md "WIP")
[![Deutsch](https://img.shields.io/badge/Deutsch-grey)](/translations/README.de.md "WIP")
[![Italiano](https://img.shields.io/badge/Italiano-grey)](/translations/README.it.md "WIP")

<!-- A free and open-source Discord bot for looking up cards and other useful information about the Yu-Gi-Oh! Trading Card Game, Official Card Game, Rush Duel, and Master Duel video game. -->
遊☆戯☆王オフィシャルカードゲーム、遊戯王ラッシュデュエル、遊戯王マスターデュエル、_Yu-Gi-Oh! Trading Card Game_ のカードや便利な情報を調べるための、自由でオープンソースなディスコード上のボットです。

<!-- **[Get started with searching for cards using `<>` in your messages!](/docs/card-search.md)**
For Slash Command documentation, look in [`docs/commands`](/docs/commands).
For everything else, please refer to the old [Bastion Classic](https://github.com/AlphaKretin/bastion-bot) repository. -->
**[メッセージ中のカード名を`<>` で囲って検索できるようになりましたよ！](/docs/card-search.md)**
スラッシュコマンドでのカード検索方法は、[`docs/commands`](/docs/commands)をご参照ください。
その他については旧版の[Bastionクラシック](https://github.com/AlphaKretin/bastion-bot)リポジトリを参照してください。

<!-- Thanks to [YGOPRODECK](https://ygoprodeck.com/) for sponsoring Bastion. Prices provided by Bastion are YGOPRODECK affiliate links.-->
本ボットは[YGOPRODECK](https://ygoprodeck.com/)の提供でお送りしています。価格情報はYGOPRODECKへのアフィリエイトリンクになっています。

<!-- Card images and most card data are sourced from [Yugipedia](https://yugipedia.com/) via [YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi). -->
カード画像とほとんどのカードデータは[YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi)を経由して[Yugipedia](https://yugipedia.com/)から取得しています。



[<img src="https://img.shields.io/badge/invite%20to-discord-brightgreen?style=for-the-badge" alt="Invite to Discord" />](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
&nbsp;
[<img src="https://img.shields.io/badge/App%20Directory-darkgreen?style=for-the-badge" alt="Discord App Directory" />](https://discord.com/application-directory/383854640694820865)


<!--## Discord permissions-->
## ディスコードでの権限

<!--Please make sure you use an [invite link](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)
that automatically grants the following permissions.-->
以下の権限を与える設定になっている[招待リンク](https://discord.com/api/oauth2/authorize?client_id=383854640694820865&permissions=274878285888&scope=bot%20applications.commands)を使ってください。



<!-- - Create commands in a server-->
<!-- 'Create commands' permission is asked when you select which server to add Bastion along with 'Add a bot to a server' permission. Others are asked later when you authorize them for a certain server you selected.-->
- コマンドを作成
- メッセージを送信<!-- - Send Messages-->
- スレッドでメッセージを送信<!-- - Send Messages in Threads-->
- 埋め込みリンク（カード情報を表現力豊かなディスコードの埋め込みリンク機能を使って表示します。）<!-- - Embed Links: Bastion displays card information in a Discord rich embed.-->
- ファイルを添付（カード画像を添付することがあります。）<!-- - Attach Files: Bastion attaches card images for trivia.-->
- メッセージ履歴を読む（カード検索のリクエストメッセージにリプライを飛ばします）<!-- - Read Message History: Bastion replies to messages that request card search.-->
- 外部の絵文字を使用する（埋め込みリンクの中で遊戯王のアイコンとして絵文字をいくつか使います）<!-- - Use External Emojis: Bastion uses certain emojis for Yu-Gi-Oh icons in its embeds.-->
- リアクションの追加（リアクションボタンを出力のコントロールに使います）<!-- - Add Reactions: Bastion uses "reaction buttons" for advanced control of outputs.-->

<!-- If you do not want Bastion to be used in a channel, deny it the View Channel permission.
Otherwise, all of the above permissions **must** be granted to Bastion in each channel it is
available in for it to work correctly.-->
特定のチャンネルでのみ本ボットを使いたくない場合は、チャンネルの権限設定にて「チャンネルを見る」の権限を与えないようにしてください。
そうでない場合は、本ボットが正常に動作するには、上記のすべての権限が本ボットがアクセス可能なそれぞれのチャンネルにて**許可されなければなりません**。


<!-- If you do not want Slash Commands to be used in a channel, this can be managed per command in the Integrations tab of
your server settings. Alternatively, you can blanket deny the Use Application Commands permission for the individuals
or roles in question, but this will apply to all bots.-->
スラッシュコマンドを特定のチャンネルで使いたくない場合は、サーバ設定の「連携サービス」タブから設定できます。
あるいは、「アプリコマンドを使う」の権限をロールや個人に与えないことでもスラッシュコマンドの使用を阻止できますが、これはすべてのボットに対して適用されます。

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
