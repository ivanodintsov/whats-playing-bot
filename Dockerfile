FROM node:26.3.0-alpine3.23 AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV UV_THREADPOOL_SIZE=4

USER root

RUN npm install -g corepack@0.35.0
RUN corepack enable

USER node

WORKDIR /home/node

COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
COPY --chown=node:node .yarn/ .yarn/

RUN yarn install --immutable

COPY --chown=node:node . .

RUN yarn build

CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js"]

