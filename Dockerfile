# Multi-Stage Production Dockerfile for Ekdant Mitra Mandal
# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Production Server with Persistent SQLite Volume
FROM node:20-alpine AS production
WORKDIR /app

# Install native dependencies required for better-sqlite3 build
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./

# Copy built frontend assets to all candidate static paths for 100% reliable serving
COPY --from=frontend-builder /app/client/dist /app/client/dist
COPY --from=frontend-builder /app/client/dist /app/server/public

# Create persistent storage directories
RUN mkdir -p /app/server/data /app/server/uploads

# Expose Persistent Volumes for SQLite Database & Uploads
VOLUME ["/app/server/data", "/app/server/uploads"]

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "src/index.js"]
