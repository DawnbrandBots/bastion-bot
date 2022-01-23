# `/search` command

Find all information on a card! _This command is in development._

## Definitions

[**Password**](https://yugipedia.com/wiki/Password): the number printed in the bottom-left corner of a _Yu-Gi-Oh!_ card.

[**Konami ID**](https://yugipedia.com/wiki/List_of_cards_by_Konami_index_number_(4007%E2%80%935000)): the ID assigned to the card in the [official card database](https://www.db.yugioh-card.com/).

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The password, Konami ID, or name you're searching by. | text
`lang` | ❌ | The result language. | one of "en", "fr", "de", "it", "pt"
`type` | ❌ | Whether you're searching by password, Konami ID, or name. | one of "password", "kid", "name"

## Current behaviour

If `type` is unspecified, infers the type of `input` using these rules:

- numbers are treated as passwords
- numbers that start with `#` are treated as Konami IDs
- anything else is treated as a name

In the first two cases, a direct lookup of the card is performed using that password or Konami ID.
In the latter case, an English-language fuzzy search is performed on the English card name.

The public reply will either be a no-match message or the card information presented in
Discord embeds. This will be in the requested `lang` if specified, otherwise using the
locale for the channel or server per [Bastion's locale setting](/docs/command/locale.md),
and falling back to English if not available.

The following information is displayed:

- card name, hyperlinked to the [YGOPRODECK](https://db.ygoprodeck.com/) data source
- frameless card artwork, if available
- card frame colour
- for monsters where applicable, with appropriate official icons: Type, Attribute, Level/Rank/Link Rating, Pendulum Scale, ATK, DEF
- card text
- for Pendulum Monsters, the Pendulum Effect if any
- password and Konami ID

### Limitations

- the displayed Type is not the type line written on the card, but a value interpreted by YGOPRODECK;
  the Tuner property is often lost
- `?` ATK and DEF are interpreted as 0
- some passwords may be incorrect due to alternate artworks as only one is displayed
- Konami ID may be missing and display as `#null`
- Pendulum Effect may be formatted incorrectly

## Next steps

In no particular order:

- fix issues described in limitations, pending data quality improvement
- add current Forbidden & Limited List status in all world regions
- add pricing information
- hyperlink to Yugipedia and official database
- display major card type (Monster, Spell, Trap) and frame colour in text for accessibility
- support non-English searches
- support cross-language searches
- handle alternative artworks
- add support for more languages (Spanish, Japanese, Korean, Chinese)
- localize labels used in the embed
- add a button to pull up more matches like the old `.match` or `.search`
- depending on how alternative artworks are handled, add a button to display those too
- support simple queries on other card properties
- support advanced queries based on all relevant card properties
- support fuzzy search on card description
- show first and last printing date, region-dependent
- show sets and set numbers
