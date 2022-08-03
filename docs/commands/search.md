# `/search` command

Find all information on a card! _This command is in development._

## Definitions

[**Password**](https://yugipedia.com/wiki/Password): the number printed in the bottom-left corner of a _Yu-Gi-Oh!_ card.

[**Konami ID**](https://yugipedia.com/wiki/List_of_cards_by_Konami_index_number_(4007%E2%80%935000)): the ID assigned to the card in the [official card database](https://www.db.yugioh-card.com/).

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The password, Konami ID, or name you're searching by. | text
`input-language` | ❌ | The language to search in. | one of the [supported locales](./locale.md#parameters)
`result-language` | ❌ | The output language for the card embed. | one of the [supported locales](./locale.md#parameters)
`type` | ❌ | Whether you're searching by password, Konami ID, or name. | one of "password", "kid", "name"

## Current behaviour

If `input-language` is unspecified, it is assumed to be `result-language`.

If `result-language` is unspecified, it defaults to the setting for the
channel or server per [Bastion's locale setting](./locale.md).

If `type` is unspecified, infers the type of `input` using these rules:

- numbers are treated as passwords
- numbers that start with `#` are treated as Konami IDs
- anything else is treated as a name

In the first two cases, a direct lookup of the card is performed using that password or Konami ID.
In the latter case, an fuzzy search is performed with the provided `input` in the `input-language`.
For searches in Japanese and Korean, this will consider every possible combination of ruby and base text.

The public reply will either be a no-match message or the card information presented in
Discord embeds. This will be in the requested `result-language`, falling back to English
where translations are not available.

The following information is displayed:

- card name, hyperlinked to the Yugipedia data source
  - includes ruby text for Japanese and Korean results
  - additional romanizations follow if available
- frameless card artwork, if available
- card frame colour
- for monsters where applicable, with appropriate official icons: Type, Attribute, Level/Rank/Link Rating, Pendulum Scale, ATK, DEF
- for Spells and Traps, the property and icon
- card text, with OCG numbered effects organized on separate lines
  - for Pendulum Monsters, the Pendulum Effect if any
- hyperlinks to the official database, Yugipedia, and YGOPRODECK
- password and Konami ID

### Limitations

- Discord cannot render ruby text in position, so it is appended in parentheses

## Next steps

In no particular order:

- add current Forbidden & Limited List status in all world regions
- add pricing information
- handle alternative artworks
- add a button to pull up more matches like the old `.match` or `.search`
- depending on how alternative artworks are handled, add a button to display those too
- support simple queries on other card properties
- support advanced queries based on all relevant card properties
- support fuzzy search on card description
- show first and last printing date, region-dependent
- show sets and set numbers
