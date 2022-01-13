# `/id` command

Get all unique identifiers for a card from one of them! _This command is in development._

## Definitions

[**Password**](https://yugipedia.com/wiki/Password): the number printed in the bottom-left corner of a _Yu-Gi-Oh!_ card.

[**Konami ID**](https://yugipedia.com/wiki/List_of_cards_by_Konami_index_number_(4007%E2%80%935000)): the ID assigned to the card in the [official card database](https://www.db.yugioh-card.com/).

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`input` | ✔ | The password, Konami ID, or name you're searching by. | text
`type` | ❌ | Whether you're searching by password, Konami ID, or name. | one of "password", "kid", "name"

## Current behaviour

If `type` is unspecified, infers the type of `input` using these rules:

- numbers are treated as passwords
- numbers that start with `#` are treated as Konami IDs
- anything else is treated as a name

In the first two cases, a direct lookup of the card is performed using that password or Konami ID.
In the latter case, an English-language fuzzy search is performed on the English card name.

If no match is found, an ephemeral reply informs only the caller. Otherwise, an ephemeral reply delivers all three identifiers to the user in a Discord embed.

### Limitations

- The name input currently only supports English.
- The output also currently prints in English, and we don't have translations of the terms prepared.
- Konami ID may be missing and display as `#null`.

## Next steps

In no particular order:

- support non-English searches
- support cross-language searches
- add support for more languages (Spanish, Japanese, Korean, Chinese)
- localize labels used in the embed
- set default language per server or per channel, including direct messages
