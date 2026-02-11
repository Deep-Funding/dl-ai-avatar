# ---- Base build image ----
FROM node:20-alpine AS builder

WORKDIR /app

# Update npm to avoid version warning
RUN npm install -g npm@11.6.0

# Install dependencies only when needed
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy all files
COPY . .

# Accept GEMINI_API_KEY as a build arg
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Build Next.js app
RUN npm run build

# ---- Production image ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy required files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Start Next.js on Cloud Run’s port
CMD ["npx", "next", "start", "-p", "8080"]
