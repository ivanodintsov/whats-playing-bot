FROM node:16.15.1-alpine3.15

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

USER node
WORKDIR /home/node

COPY package*.json yarn*.lock ./

RUN  yarn install --production=false

COPY --chown=node:node . .

RUN yarn build

CMD ["node", "dist/main.js"]
