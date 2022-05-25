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

Bastion has several systems for localizations. Translations for card text are part of the card data.

Slash Command names, descriptions, and options are provided to Discord when the commands are
registered. It is the responsibility of Discord to display these to users correctly based on the
user's language setting, which is in beta as of writing. How these translations are organized in
Bastion's codebase is to be determined.

Finally, the localization that Bastion uses in its messages when replying to user commands is
obtained from a `gettext`-like system called [ttag](https://ttag.js.org/). These translations are
stored in standard `.po` files, which can be edited in your favourite text editor or a variety of
offline and online tools. These are stored in the `translations` directory of the repository.

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
