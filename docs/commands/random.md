# `/random` command

Get a random Yu-Gi-Oh! card. _This command is in development._

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`lang` | ❌ | The result language. | one of "en", "fr", "de", "it", "pt"

## Current behaviour

Select one random card. The public reply will be the card information presented in Discord embeds.
The remaining behaviour matches a successful use of [`/search`](./search.md).

This will be in the requested `lang` if specified, otherwise using the
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

See [`/search`](./search.md).

## Next steps

See [`/search`](./search.md).

Support getting multiple cards at once.
