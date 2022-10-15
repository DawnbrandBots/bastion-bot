# Translating bot display text

We will only support the subset of [Discord locales](https://discord.com/developers/docs/reference#locales)
that have an official Yu-Gi-Oh! release, unless there is a compelling reason otherwise. These are:

- en-GB and en-US for British and American English. There's no difference for card text, which is
  always spelled the American way, but Bastion will intentionally choose Australian spellings for its
  own interface text outside the card text.
- de (Deutsch)
- es-ES (Español)
- fr (Français)
- it (Italiano)
- pt-BR (Português do Brasil). Konami does not differentiate between Portuguese dialects these days,
  but this is the only locale available from Discord.
- ja (日本語)
- ko (한국어)
- zh-CN (中文) and zh-TW (繁體中文) should have interface text translated together.

Translations for card text are part of the card data.

All Bastion user interface localisations (Slash Command interfaces, messages, card embeds) are
obtained from a `gettext`-like system called [ttag](https://ttag.js.org/). These translations are
stored in standard `.po` files, which can be edited in your favourite text editor or a variety of
offline and online tools. These are stored in the `translations` directory of this repository.

Slash Command names, descriptions, and options are provided to Discord when the commands are
registered. Discord is responsible for displaying these to users based on the
user's language setting.

For strings labelled "command-name" and "command-option", Discord enforces a rule in the spirit of
the original English strings, [prohibiting spaces and majuscule characters if they exist in the locale](https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-naming).

## For developers

To start a translation for a new `LOCALE`, run this in the repository root after installing
dependencies to create the template, or ask a maintainer to create this file for you.

```bash
yarn ttag init LOCALE translations/LOCALE.po
```

That only creates an initial file. To populate the file with all the strings that need to be
translated in the program code, run the following command. This should be rerun every time there
are new translations that are needed. It will not overwrite existing translations.

```bash
yarn ttag update translations/LOCALE.po src/{,**/*}*.ts
```

Note: the babel configurations in `package.json` are not strictly necessary but suppress a lot of
warnings from these commands due to our use of newer language features.

To update all translation files at once after a code change:

```bash
find translations -type f -name '*.po' -exec yarn ttag update {} src/{,**/*}*.ts \;
```

A bug causes ttag to add `msgstr[1] ""`, even for locales without plural forms, as specified by
the Plural-Forms header. This doesn't happen the first time the strings are picked up, but on
subsequent runs when they are already in the file. The locales we care about are the CJK locales,
so for now we will have to manually remove the extraneous lines after generation.

```bash
sed -i '/^msgstr\[1\] ""$/d' translations/ja.po translations/ko.po translations/zh-CN.po translations/zh-TW.po
```
