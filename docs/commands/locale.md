# `/locale` command

Check or set Bastion's locale for this channel or server. _This command is in development._

This setting is meant to apply to all text displayed by the new instance of Bastion, but
translations may not be complete, in which case it will fall back to English. Features
still handled by the old instance will not be affected.

## Definitions

**Locale**: a parameter affecting _localisation_, such as what language and dialect are used,
and how time and numbers should be formatted. The set of locales supported by Discord happens
to be a superset of the official localisations of _Yu-Gi-Oh!_.

## General bot localisation behaviour

In direct messages, Bastion will try to use the user's display locale as reported by Discord,
which should be the display language of the client. This can be overridden by the user
with this command.

By default, in servers Bastion will try to use the server-reported locale by Discord,
which is so far only configurable for Community servers in the settings as "Server Primary Language".
This can be overridden server-wide with this command, or a per-channel basis, the
most specific override taking precedence. Threads inherit their locale setting from
their parent channel and cannot have it independently overridden. This is because of
their largely temporary nature, but if there is a need for thread-specific overrides,
we can consider implementing it.

## Subcommand `/locale get`

Displays the currently-effective locale in the channel it is used and any overrides.

## Subcommand `/locale set`

### Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`scope` | ✔ | Edit just this channel or the whole server? | "channel" or "server"
`locale` | ✔ | The new default language to use in this channel or server. | see below

Choices for `locale`:

- Discord default (unset the override, not actually a locale)
- English
- Español (Spanish)
- Français (French)
- Deutsch (German)
- Italiano (Italian)
- Português (Portuguese)
- 日本語 (Japanese)
- 한국어 (Korean)
- 简体中文 (Simplified Chinese)
- 繁體中文 (Traditional Chinese)

### Current behaviour

In direct messages, the `scope` parameter has no effect. The specified `locale` override
is applied to the direct message, or reset to the user's display locale.

In servers, the caller must have the Manage Channel permission for the current channel if
`scope` is "channel", or the Manage Server permission if `scope` in "server". Bastion will
reply with the missing permission if missing. Otherwise, if authorised, the specified
`locale` override is applied to the specified `scope`, or reset for the specified `scope`.

## Next steps

- Fully translate Bastion.
- Permission control for `/locale set` could alternatively be controlled by a role instead.
