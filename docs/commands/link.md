# `/link` command

Quickly access links to useful information! _This command is in development._

## Parameters

Name | Required? | Description | Type
--- | --- | --- | ---
`key` | ✔ | The name of the link you wish to be displayed | text, see below

## Current behaviour

As enforced by the Discord Slash Command, `key` must be the name of one of the links in the table below. Bastion will respond by printing the link. If it is a link to an image, it is expected that Discord will embed the image.

Name | Link | Description
--- | --- | ---
TCG Banlist | https://www.yugioh-card.com/uk/limited/ | The Yu-Gi-Oh! Trading Card Game Forbidden and Limited list.
OCG Banlist | https://www.yugioh-card.com/my/event/rules_guides/forbidden_cardlist.php?lang=en | The Yu-Gi-Oh! Official Card Game Forbidden and Limited list.
Korean Banlist | http://yugioh.co.kr/site/limit_regulation.php | The Forbidden and Limited list used in the Korean region.
Double Summon List | https://ygorganization.com/doublesummonlist/ | An educational article on the YGOrganization about different types of Double Summon effects.
Forgetting | https://ygorganization.com/learnrulingspart13/ | An educational article on the YGOrganization about the "forgetting" mechanic.
Damage Step | https://www.yugioh-card.com/uk/gameplay/damage.html, http://yugipedia.com/wiki/Damage_Step#Cards_and_effects_that_can_be_activated | The official breakdown of the rules for the different substeps of the Damage Step, as well as a Yugipedia article detailing the rules for what cards can be activated during the damage step.
Link Summons | https://cdn.discordapp.com/attachments/377682286394736650/690868673157791774/unknown.png | A screenshot of the official rulebook that clarifies the rules regarding materials for Link Summons.
Fast Effect Timing Chart | https://img.yugioh-card.com/en/wp-content/uploads/2021/05/T-Flowchart_EN-US.jpg | An official rulings resource that aids in clarifying when players are allowed to activate certain kinds of card effect.
Summon Negation Timing | https://puu.sh/CLinf/3332459d3c.png | A diagram explaining the reasons behind an edge case in the rulings regarding negating the summon of a monster.
ATK/DEF Modification | https://ygorganization.com/atk-def-modification-and-you/ | An educational YGOrganization article that can serve as a reference for the sometimes-confusing rules for modifying the ATK and DEF of cards.
Special Summon Monsters | https://cdn.discordapp.com/attachments/184324960842416129/680508513105346659/nomi_monsters.png | A screenshot of the official rulebook clarifying an oft-overlooked rule regarding monsters that must first be Special Summoned.
Rivalry/Gozen Rulings | https://img.yugioh-card.com/ygo_cms/ygo/all/uploads/CardFAQ_Rivalry-of-Warlords_Gozen-Match-1.pdf | The official rulings resource for the cards "Rivalry of Warlords" and "Gozen Match".

### Limitations

- Link names are only in English and may be unclear to speakers of other languages
- The output of many of the links is also in English and may not be helpful to speakers of other languages

## Next steps

In no particular order:

- We're always willing to add more useful links to this list should they arise.
- i18n of the link names may be difficult because the Discord Slash Command interface has poor native support for i18n.
- i18n support for the contents of the links may also be difficult, as the resources may not have a direct equivalent in another language.
