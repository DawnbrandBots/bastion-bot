# `/ygoprodeck` command

Search the [YGOPRODECK card database](https://db.ygoprodeck.com/) for an entry!

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`term` | ✔ | The name or password of the card you're looking for. | text

## Current behaviour

Searches db.ygoprodeck.com the same way as its search bar. If a card is found, Bastion replies with a public text message linking to it. It is expected that Discord will provide an embed for this link. Otherwise, Bastion replies with a public text message containing an error message.

## Next steps

Improve error handling for the HTTP request to YGOPRODECK.
