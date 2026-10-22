FROM node:26.12.1-alpine3.24 AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV UV_THREADPOOL_SIZE=4

USER root

RUN npm install -g yarn

USER node

WORKDIR /home/node

COPY package*.json yarn*.lock ./

RUN  yarn install --production=false

COPY --chown=node:node . .

RUN yarn build

CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js"]

