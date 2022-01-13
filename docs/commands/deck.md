# `/deck` command

Display the contents of a deck in Discord! _This command is in development._

## Definitions

**YDKE**: A storage format for Yu-Gi-Oh! decks that can be exported from various deck building applications. They look like URLs, beginning with `ydke://`. An example of a YDKE URL looks like this: `ydke://1xqfAdcanwHXGp8Bd+lHBHfpRwR36UcEX8ZAAl/GQAJfxkACYx3EAzA20AMwNtADMDbQA/liqgQk6AgEJOgIBCToCASxxDUDscQ1A7HENQPw6KgA8OioAPDoqADAqZQA/YmcBf2JnAX9iZwFppv0Aaab9AGmm/QBgAhAAsWp2gTvJf4EkWK+BZFivgWRYr4FBlTqBQZU6gUGVOoFPqRxAcLHcgHCx3IBwsdyAQ==!Vi0OBRXfCwVs1ZQA8GQuALiBCQPBGnIE/gDeA2jWawV9vZ8DoBOYBIPjPgI1tL4EhGVOAbXg4AQBroQB!sjLMBbIyzAWyMswFQ77dAEO+3QBDvt0AJpBCAyaQQgMmkEIDhCV+AIQlfgCEJX4Ab3bvAG927wCBFq4D!`.

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`deck` | ✔ | The YDKE URL of the deck you want to display. | text
`public` | ❌ | Whether to display the deck publicly, or only show it to yourself with an ephemeral reply. | boolean
`stacked` | ❌ | Whether to display deck sections stacked on top of each other in one long column, or in seperate columns side-by-side. | boolean

## Current behaviour

If `public` is unspecified, it defaults to false, meaning Bastion will use an ephemeral reply. If `stacked` is unspecified, it defaults to false, meaning Bastion will show sections of the deck in side-by-side columns.

If `deck` is not a valid YDKE URL, Bastion will respond with an error message in an ephemeral reply.

If the deck is valid, Bastion will process its contents and present the contents of the deck in a Discord embed. Whether the reply is ephemeral or public depends on the `public` option. The Main Deck, Extra Deck, and Side Deck are seperated into their own sections, displayed in that respective order, arranged as per the `stacked` option. If the contents of a section exceed 1024 characters, that section is split further into multiple as needed.

The heading of each section contains a count of how many cards that section contains, as well as a break down of card types. For the Main and Side Deck, a count of Monster, Spell and Trap cards is provided, while for the Extra Deck, a count of Fusion, Synchro, Xyz and Link monsters are provided.

Duplicate cards in the deck are compressed into one line, counting how many times the card appears in the format `# Card Name`, for example, `3 Junk Synchron`.

### Limitations

- This command currently only displays card names in English.
- Headings for the deck sections, and names for card types, also are only in English, and we do not have translations prepared.
- Due to Discord limitations on Slash Command parameters, input of a `YDK` file is not supported.
- With `stacked` false, the section headings overflow the width of a column and wrap, harming aesthetics and readability.

## Next steps

See #22.
