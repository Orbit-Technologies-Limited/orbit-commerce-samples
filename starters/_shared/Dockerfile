# Orbit hosting runs linux/arm64: docker buildx build --platform linux/arm64 .
#
# The image Orbit hosting runs as it is: it listens on PORT (8080) on every interface,
# answers GET /health, runs as uid 1000 on a read-only root (only /tmp is writable),
# applies the Postgres migrations at start (scripts/start.mjs) and stops on SIGTERM.

FROM node:24-alpine AS deps
# Prisma's engines need OpenSSL on Alpine.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts
# The hosted client is the Postgres one, with its query engine for this platform.
RUN npx prisma generate --schema prisma/postgres/schema.prisma

# The Prisma CLI with everything it needs (migrate deploy runs it at start), at the version
# package.json pins, with its engines fetched now: the running image cannot download anything.
FROM node:24-alpine AS migrate
RUN apk add --no-cache openssl
WORKDIR /migrate
COPY package.json /tmp/package.json
RUN npm install --no-audit --no-fund "prisma@$(node -p "require('/tmp/package.json').devDependencies.prisma")" \
 && node node_modules/prisma/build/index.js version > /dev/null

FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

FROM node:24-alpine AS run
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
COPY --from=build --chown=1000:1000 /app/.next/standalone ./
COPY --from=build --chown=1000:1000 /app/.next/static ./.next/static
COPY --from=build --chown=1000:1000 /app/public ./public
COPY --from=build --chown=1000:1000 /app/prisma ./prisma
COPY --from=build --chown=1000:1000 /app/scripts/start.mjs ./scripts/start.mjs
# The Prisma CLI and its dependencies, for migrate deploy at start, then the generated
# Postgres client and its engine over the copy the standalone build traced.
COPY --from=migrate --chown=1000:1000 /migrate/node_modules ./node_modules
COPY --from=deps --chown=1000:1000 /app/node_modules/.prisma ./node_modules/.prisma
USER 1000
EXPOSE 8080
CMD ["node", "scripts/start.mjs"]
