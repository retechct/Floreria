FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/prepare-assets.js ./scripts/prepare-assets.js
RUN npm ci --omit=dev
COPY --chown=node:node server.js *.html ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node data ./data
COPY --chown=node:node assets ./assets
COPY --chown=node:node public ./public
COPY --chown=node:node scripts ./scripts
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server.js"]
