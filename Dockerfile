# syntax=docker/dockerfile:1

FROM node:18.20.0-alpine3.19 AS base
ARG APP_PATH=/app
WORKDIR $APP_PATH
RUN apk add --no-cache python3 make g++ \
 && npm install -g pnpm@12

FROM base AS deps
COPY .npmrc /root/.npmrc
RUN echo "inject-workspace-packages=true" >> /root/.npmrc
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/webapp/package.json ./packages/webapp/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS server-builder
COPY packages/server ./packages/server
RUN pnpm build:server \
 && pnpm --filter ./packages/server deploy --prod /prod/server

FROM deps AS webapp-builder
COPY packages/webapp ./packages/webapp
COPY packages/server/view ./packages/server/view
COPY scripts ./scripts
RUN pnpm build:webapp \
 && node scripts/update-index.html.js

FROM node:18.20.0-alpine3.19 AS runner
ARG APP_PATH=/app
WORKDIR $APP_PATH
ENV NODE_ENV=production

COPY --from=server-builder --chown=node:node /prod/server/node_modules ./node_modules
COPY --from=server-builder --chown=node:node /prod/server/package.json ./package.json
COPY --from=server-builder --chown=node:node $APP_PATH/packages/server/dist ./dist
COPY --from=server-builder --chown=node:node $APP_PATH/packages/server/resources ./resources
COPY --from=server-builder --chown=node:node $APP_PATH/packages/server/static ./static
COPY --from=server-builder --chown=node:node $APP_PATH/packages/server/src ./src
COPY --from=server-builder --chown=node:node $APP_PATH/packages/server/tsconfig.json ./tsconfig.json
COPY --from=webapp-builder --chown=node:node $APP_PATH/packages/webapp/dist ./view
COPY --from=webapp-builder --chown=node:node $APP_PATH/packages/server/view/index.html ./view/index.html
COPY --chown=node:node packages/server/view/social-login.html packages/server/view/connect-stripe.html ./view/

USER node
EXPOSE 8000
CMD ["node", "--enable-source-maps", "dist/main.js"]
