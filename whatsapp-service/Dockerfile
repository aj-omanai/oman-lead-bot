# Standalone WhatsApp sender — must run as an always-on process with a
# persistent volume mounted at /app/auth_state (Baileys session credentials
# live there). Not deployable to a serverless/stateless platform.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

# Mount a persistent volume here in production (Fly.io: `fly volumes create`,
# then set `[mounts]` in fly.toml; Railway: attach a volume in the service
# settings). Losing this directory logs every connected WhatsApp number out.
VOLUME ["/app/auth_state"]

EXPOSE 8787
CMD ["node", "dist/server.js"]
