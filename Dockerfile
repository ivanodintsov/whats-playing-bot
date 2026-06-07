FROM node:26.3.0-alpine3.23 AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV UV_THREADPOOL_SIZE=4

USER node
WORKDIR /home/node

COPY package*.json yarn*.lock ./

RUN npm install -g yarn

RUN  yarn install --production=false

COPY --chown=node:node . .

RUN yarn build

CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js"]

