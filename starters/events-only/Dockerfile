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
# The hosted client is the Postgres one; this also fetches the engines migrate deploy needs.
RUN npx prisma generate --schema prisma/postgres/schema.prisma

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
# The Prisma CLI and its engines, for migrate deploy at start.
COPY --from=deps --chown=1000:1000 /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=1000:1000 /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=1000:1000 /app/node_modules/.prisma ./node_modules/.prisma
USER 1000
EXPOSE 8080
CMD ["node", "scripts/start.mjs"]
