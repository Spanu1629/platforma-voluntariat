FROM node:24-bookworm-slim AS migrate
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

CMD ["npm", "run", "db:migrate"]

FROM migrate AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=migrate /app/package.json ./package.json
COPY --from=migrate /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
