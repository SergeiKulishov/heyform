FROM node:18.20.0-alpine3.19 AS base

ARG APP_PATH=/app
WORKDIR $APP_PATH
#ARG NPM_TOKEN

RUN npm install -g pnpm
RUN apk add --no-cache python3 make g++

# npm auth (ВАЖНО: до pnpm install)
#RUN echo "//nexus.nlnano.ru/repository/npm-hosted/:_authToken=${NPM_TOKEN}" > /root/.npmrc

COPY .npmrc /root/.npmrc
COPY package.json $APP_PATH/package.json
COPY pnpm-lock.yaml $APP_PATH/pnpm-lock.yaml
COPY pnpm-workspace.yaml $APP_PATH/pnpm-workspace.yaml
COPY packages/server $APP_PATH/packages/server
COPY packages/webapp $APP_PATH/packages/webapp
COPY scripts $APP_PATH/scripts

RUN pnpm install
RUN pnpm build:server
RUN pnpm build:webapp
RUN node scripts/update-index.html.js

FROM node:18.20.0-alpine3.19 AS runner

ARG APP_PATH=/app
WORKDIR $APP_PATH
#ARG NPM_TOKEN

RUN npm install -g pnpm
RUN apk add --no-cache python3 make g++

COPY .npmrc /root/.npmrc

COPY --from=base $APP_PATH/packages/server/dist ./dist
COPY --from=base $APP_PATH/packages/server/resources ./resources
COPY --from=base $APP_PATH/packages/server/static ./static
COPY --from=base $APP_PATH/packages/server/src ./src
COPY --from=base $APP_PATH/packages/server/tsconfig.json ./tsconfig.json
COPY --from=base $APP_PATH/packages/server/package.json ./package.json
COPY --from=base $APP_PATH/packages/webapp/dist ./view
COPY --from=base $APP_PATH/packages/server/view/index.html ./view/index.html

RUN pnpm install --prod

EXPOSE 8000
CMD ["npm", "start"]
