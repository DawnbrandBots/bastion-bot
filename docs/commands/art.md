# `/search` command

Diosplay the art for a card! _This command is in development._

## Definitions

[**Password**](https://yugipedia.com/wiki/Password): the number printed in the bottom-left corner of a _Yu-Gi-Oh!_ card.

[**Konami ID**](https://yugipedia.com/wiki/List_of_cards_by_Konami_index_number_(4007%E2%80%935000)): the ID assigned to the card in the [official card database](https://www.db.yugioh-card.com/).

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The password, Konami ID, or name you're searching by. | text
`input-language` | ❌ | The language to search in. | one of the [supported locales](./locale.md#parameters)
`type` | ❌ | Whether you're searching by password, Konami ID, or name. | one of "password", "kid", "name"

## Current behaviour

If `input-language` is unspecified, it is assumed to be the setting for the
channel or server per [Bastion's locale setting](./locale.md).

If `type` is unspecified, infers the type of `input` using these rules:

- numbers are treated as passwords
- numbers that start with `#` are treated as Konami IDs
- anything else is treated as a name

In the first two cases, a direct lookup of the card is performed using that password or Konami ID.
In the latter case, an fuzzy search is performed with the provided `input` in the `input-language`.

The public reply will either be a no-match message or a URL for an image of the card artwork, with the expectation that Discord automatically embeds this.

### Limitations

- Availability and quality of the artwork is consistent.
- Currently no good handling for alternate artworks.

## Next steps

In no particular order:

- fix issues described in limitations
- handle alternative artworks
- depending on how alternative artworks are handled, add a button to display those too
