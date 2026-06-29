# ─── Multi-stage Dockerfile ────────────────────────────────
# node_modules are installed in a separate deps stage.
# npm ci only re-runs when package.json or package-lock.json changes.
# Unrelated source file changes do NOT invalidate the node_modules layer.

# Stage 1 — deps: install dependencies (cached until package files change)
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci; npm install @rollup/rollup-linux-arm64-gnu --no-save 2>&1 || true

# Stage 2 — dev: development with hot reload
FROM node:20-slim AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4300
CMD ["npm", "start"]

# Stage 3 — builder: production Angular build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx ng build --configuration production --output-path /app/dist

# Stage 4 — prod: Nginx serving production build
FROM nginx:alpine AS prod
COPY --from=builder /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
