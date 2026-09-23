# --- deps: install once, reused by both the build and seed stages ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript with tsc (real decorator-metadata emission,
#     required by @nestjs/mongoose - see docs/design.md's fix(database) commit) ---
FROM deps AS build
WORKDIR /app
COPY . .
RUN npx nest build

# --- runtime: production deps only, compiled output, non-root user ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S refunddesk && adduser -S refunddesk -G refunddesk

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY policy ./policy

USER refunddesk
EXPOSE 3000

CMD ["node", "dist/main.js"]
