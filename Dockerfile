FROM node:18.20.0-alpine3.19 AS base

ARG APP_PATH=/app
WORKDIR $APP_PATH

RUN npm install -g pnpm
RUN apk add --no-cache python3 make g++

COPY package.json $APP_PATH/package.json
COPY pnpm-lock.yaml $APP_PATH/pnpm-lock.yaml
COPY pnpm-workspace.yaml $APP_PATH/pnpm-workspace.yaml
COPY packages/server $APP_PATH/packages/server
COPY packages/webapp $APP_PATH/packages/webapp
COPY packages/server/view/index.html $APP_PATH/packages/webapp/index.html

RUN pnpm install
RUN pnpm build:server
RUN pnpm build:webapp
RUN pnpm --filter ./packages/webapp export

FROM node:18.20.0-alpine3.19 AS runner

ARG APP_PATH=/app
WORKDIR $APP_PATH

RUN npm install -g pnpm
RUN apk add --no-cache python3 make g++

COPY --from=base $APP_PATH/packages/server/dist ./dist
COPY --from=base $APP_PATH/packages/server/resources ./resources
COPY --from=base $APP_PATH/packages/server/static ./static
COPY --from=base $APP_PATH/packages/server/view ./view
COPY --from=base $APP_PATH/packages/server/src ./src
COPY --from=base $APP_PATH/packages/server/tsconfig.json ./tsconfig.json
COPY --from=base $APP_PATH/packages/server/package.json ./package.json

RUN pnpm install --prod

EXPOSE 9157
CMD ["npm", "start"]
