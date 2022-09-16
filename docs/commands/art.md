# `/art` command

Diosplay the art for a card! _This command is in development._

## Definitions

[**Password**](https://yugipedia.com/wiki/Password): the number printed in the bottom-left corner of a _Yu-Gi-Oh!_ card.

[**Konami ID**](https://yugipedia.com/wiki/List_of_cards_by_Konami_index_number_(4007%E2%80%935000)): the ID assigned to the card in the [official card database](https://www.db.yugioh-card.com/).

## Subcommands

- [`/art name`](#subcommand-art-name)
- [`/art password`](#subcommand-art-password)
- [`/art konami-id`](#subcommand-art-konami-id)

## Subcommand `/art name`

Display the art for the card with this name.

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | Card name to search by, fuzzy matching supported. | text
`input-language` | ❌ | The language to search in. | one of the [supported locales](./locale.md#parameters)

## Subcommand `/art password`

Display the art for the card with this password.

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The password you're searching by. | text

## Subcommand `/art konami-id`

Display the art for the card with this official database ID.

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The Konami ID you're searching by. | text

## Current behaviour

For [`/art name`](#subcommand-art-name), if `input-language` is unspecified,
it is assumed to be the setting for the channel or server per [Bastion's locale setting](./locale.md).
A fuzzy search is performed with the provided `input` in the `input-language`.
For searches in Japanese and Korean, this will consider every possible combination of ruby and base text.

For [`/art password`](#subcommand-art-password) and [`/art konami-id`](#subcommand-art-konami-id),
a direct lookup of the card is performed using that password or Konami ID.

The public reply will either be a no-match message or a URL for an image of the card artwork, with the expectation that Discord automatically embeds this.

### Limitations

- Availability and quality of the artwork is consistent.
- Currently no good handling for alternate artworks.

## Next steps

In no particular order:

- fix issues described in limitations
- handle alternative artworks
- depending on how alternative artworks are handled, add a button to display those too
