# `/search` command

Find all information on a card! _This command is in development._

## Definitions

[**Password**](https://yugipedia.com/wiki/Password): the number printed in the bottom-left corner of a _Yu-Gi-Oh!_ card.

[**Konami ID**](https://yugipedia.com/wiki/List_of_cards_by_Konami_index_number_(4007%E2%80%935000)): the ID assigned to the card in the [official card database](https://www.db.yugioh-card.com/).

## Subcommands

- [`/search name`](#subcommand-search-name)
- [`/search password`](#subcommand-search-password)
- [`/search konami-id`](#subcommand-search-konami-id)

## Subcommand `/search name`

Find all information for the card with this name.

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | Card name to search by, fuzzy matching supported. | text
`input-language` | ❌ | The language to search in. | one of the [supported locales](./locale.md#parameters)
`result-language` | ❌ | The output language for the card embed. | one of the [supported locales](./locale.md#parameters)

## Subcommand `/search password`

Find all information for the card with this password.

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The password you're searching by. | text
`result-language` | ❌ | The output language for the card embed. | one of the [supported locales](./locale.md#parameters)

## Subcommand `/search konami-id`

Find all information for the card with this official database ID.

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The Konami ID you're searching by. | text
`result-language` | ❌ | The output language for the card embed. | one of the [supported locales](./locale.md#parameters)

## Current behaviour

If `result-language` is unspecified, it defaults to the setting for the
channel or server per [Bastion's locale setting](./locale.md).

For [`/search name`](#subcommand-search-name), if `input-language` is unspecified, it is assumed to be `result-language`.
A fuzzy search is performed with the provided `input` in the `input-language`.
For searches in Japanese and Korean, this will consider every possible combination of ruby and base text.

For [`/search password`](#subcommand-search-password) and [`/search konami-id`](#subcommand-search-konami-id),
a direct lookup of the card is performed using that password or Konami ID.

The public reply will either be a no-match message or the card information presented in
Discord embeds. This will be in the requested `result-language`, falling back to English
where translations are not available.

The following information is displayed:

- card name, hyperlinked to the Yugipedia data source
  - includes ruby text for Japanese and Korean results
  - additional romanizations follow if available
- frameless card artwork, if available
- card frame colour
- current OCG and TCG Forbidden & Limited List regulations, as a number
  - OCG comes first for ja, ko, zh-CN, and zh-TW locales
  - TCG comes first for the remaining locales, and Speed Duel regulations are displayed if legal for play
- for monsters where applicable, with appropriate official icons: Type, Attribute, Level/Rank/Link Rating, Pendulum Scale, ATK, DEF
- for Spells and Traps, the property and icon
- card text, with OCG numbered effects organized on separate lines
  - for Pendulum Monsters, the Pendulum Effect if any
- hyperlinks to the official database if the card is printed, Yugipedia, and YGOPRODECK
- password and Konami ID

### Limitations

- Discord cannot render ruby text in position, so it is appended in parentheses

## Next steps

In no particular order:

- handle alternative artworks
- add a button to pull up more matches like the old `.match` or `.search`
- depending on how alternative artworks are handled, add a button to display those too
- support simple queries on other card properties
- support advanced queries based on all relevant card properties
- support fuzzy search on card description
- show first and last printing date, region-dependent
- show sets and set numbers
