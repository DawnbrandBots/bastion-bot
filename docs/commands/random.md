# `/random` command

Get a random Yu-Gi-Oh! card. _This command is in development._

![Example](../img/command-random.png)

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`result-language` | ❌ | The output language for the card embed. | one of the [supported locales](./locale.md#parameters)

## Current behaviour

Select one random card. The public reply will be the card information presented in Discord embeds.
The remaining behaviour matches a successful use of [`/search`](./search.md).

### Limitations

See [`/search`](./search.md).

## Next steps

See [`/search`](./search.md).

Support getting multiple cards at once.
