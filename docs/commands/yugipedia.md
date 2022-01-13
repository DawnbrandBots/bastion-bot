# `/yugipedia` command

Search the Yugipedia for a page!

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`page` | ✔ | The name of the Yugipedia page you want to search for. | text

## Current behaviour

Searches the Yugipedia for the specified page. If a page is successfully found, Bastion replies with a public text message containing a link to the page. It is expected that Discord will provide an embed for this link. If no page is found, Bastion replies with a public text message containing an error message.

### Limitations

- The command relies on Yugipedia's own page location algorithm which requires the name to be nearly exact unless it hits a redirect. 
- The Yugipedia is only in English, and as a result so too must the input and output of this command be. 
- The error message for a failed searched being public is unnecessary.

## Next steps

In no particular order:

- Make the error message an ephemeral reply
- Provide commands for popular databases in other languages
- Find a way to better locate pages with unclear or easy-to-mistake names?
