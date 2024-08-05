ARG NODE_VERSION=20-bullseye
FROM node:${NODE_VERSION} AS base
WORKDIR /app
COPY package*.json yarn.lock ./
RUN cat /etc/os-release /etc/debian_version && node --version && yarn --prod

FROM base AS dev
RUN yarn

FROM dev AS build
COPY . .
RUN yarn build

FROM base
ARG BOT_REVISION
LABEL org.opencontainers.image.title="Bastion Discord bot"
LABEL org.opencontainers.image.authors=bastionbotdev@gmail.com
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later
LABEL org.opencontainers.image.revision=${BOT_REVISION}
ENV BOT_REVISION=${BOT_REVISION}
WORKDIR /app
COPY COPYING .
COPY --from=build /app/dist .
COPY --from=build /app/translations translations
USER node
ENTRYPOINT ["node", "--enable-source-maps", "-r", "reflect-metadata", "."]
