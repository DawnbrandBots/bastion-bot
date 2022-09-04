# `/deck` command

Display the contents of a deck in Discord! _This command is in development._

## Definitions

**YDKE**: A storage format for Yu-Gi-Oh! decks that can be exported from various deck building applications. They look like URLs, beginning with `ydke://`. An example of a YDKE URL looks like this: `ydke://1xqfAdcanwHXGp8Bd+lHBHfpRwR36UcEX8ZAAl/GQAJfxkACYx3EAzA20AMwNtADMDbQA/liqgQk6AgEJOgIBCToCASxxDUDscQ1A7HENQPw6KgA8OioAPDoqADAqZQA/YmcBf2JnAX9iZwFppv0Aaab9AGmm/QBgAhAAsWp2gTvJf4EkWK+BZFivgWRYr4FBlTqBQZU6gUGVOoFPqRxAcLHcgHCx3IBwsdyAQ==!Vi0OBRXfCwVs1ZQA8GQuALiBCQPBGnIE/gDeA2jWawV9vZ8DoBOYBIPjPgI1tL4EhGVOAbXg4AQBroQB!sjLMBbIyzAWyMswFQ77dAEO+3QBDvt0AJpBCAyaQQgMmkEIDhCV+AIQlfgCEJX4Ab3bvAG927wCBFq4D!`.

**YDK**: A storage format for Yu-Gi-Oh! decks that can be exported from various deck building applications. They are text files, ending in the `.ydk` extension.

[**Boolean**](https://en.wikipedia.org/wiki/Boolean_data_type): A value of either `true`, meaning "yes", or `false`, meaning "no".

## Subcommands
This command has two subcommands, `/deck url` and `/deck file`. They behave the same, except for the type of the `deck` parameter. For `/deck url`, the `deck` parameter is the YDKE URL of the deck you want to display. For `/deck file`, the `deck` parameter is an attachment of a YDK file for the deck you want to display.

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`deck` | ✔ | See ["Subcommands"](#subcommands). | text or attachment
`public` | ❌ | Whether to display the deck publicly, or only show it to yourself with an ephemeral reply. | boolean
`stacked` | ❌ | Whether to display deck sections stacked on top of each other in one long column, or in seperate columns side-by-side. | boolean

## Current behaviour

If `public` is unspecified, it defaults to false, meaning Bastion will use an ephemeral reply. If `stacked` is unspecified, it defaults to false, meaning Bastion will show sections of the deck in side-by-side columns.

If `deck` is not a valid YDKE URL or YDK file, as appropriate, Bastion will respond with an error message in an ephemeral reply.

If the deck is valid, Bastion will process its contents and present the contents of the deck in a Discord embed. Whether the reply is ephemeral or public depends on the `public` option. The Main Deck, Extra Deck, and Side Deck are seperated into their own sections, displayed in that respective order, arranged as per the `stacked` option. If the contents of a section exceed 1024 characters, that section is split further into multiple as needed.

The heading of each section contains a count of how many cards that section contains, as well as a break down of card types. For the Main and Side Deck, a count of Monster, Spell and Trap cards is provided, while for the Extra Deck, a count of Fusion, Synchro, Xyz and Link monsters are provided.

Duplicate cards in the deck are compressed into one line, counting how many times the card appears in the format `# Card Name`, for example, `3 Junk Synchron`.

Bastion will upload an attachment containing the deck in YDK format, as well as printing the deck as a YDKE URL at the bottom of the output embed. This allows for conversion between the two formats, or if the reply is public, for other users to download the shared deck.

### Limitations

- With `stacked` false, the section headings overflow the width of a column and wrap, harming aesthetics and readability.