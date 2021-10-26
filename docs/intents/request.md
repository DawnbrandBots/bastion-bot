# Request Intents

## Application Details

### What does your application do? Please be as detailed as possible, and feel free to include links to image or video examples.

Bastion is a free and open-source bot for looking up cards and other useful information about the Yu-Gi-Oh! Trading Card Game and Official Card Game. It also includes a trivia game mode. Used in over 4500 servers, it is the leading Yu-Gi-Oh bot. Our working repository is https://github.com/DawnbrandBots/bastion-bot

- [ ] Server Members Intent
- [ ] Presence Intent
- [x] Message Content Intent

## Message Content Intent

### Why do you need the Message Content intent?

The inline card searching feature identifies mentioned cards in a message by angle bracket pairs. Including search terms in a message allows the query to be part of a naturally flowing conversation and supports searching for multiple cards at once when applicable, so this is significantly more convenient than alternatives.

Additionally, the "trivia" game mode in the bot asks users to identify a card by its artwork. Since it is a competitive game, users aim to type the name as fast as they can, so there need to be as few barriers to entering an answer as possible.

Message content data is not tracked to begin with.

### Please provide links to screenshots and/or videos that demonstrate your use case

![Inline card search](/docs/intents/search.png)

![Trivia minigame](/docs/intents/trivia.png)

### Can users opt-out of having their message content data tracked?

Yes

### Are you storing message content data off-platform (outside of Discord)?

No
