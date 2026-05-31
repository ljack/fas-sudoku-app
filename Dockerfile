# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json config.json ./
RUN npm ci

COPY core/ ./core/
COPY features/ ./features/
COPY scripts/ ./scripts/

# Generate manifest and compile TS
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled files and config manifests
COPY --from=builder /usr/src/app/dist ./dist
COPY config.json FAS_MANIFEST.json ./

EXPOSE 3000

# Use secure, non-root user
USER node

CMD ["node", "dist/core/engine.js"]
