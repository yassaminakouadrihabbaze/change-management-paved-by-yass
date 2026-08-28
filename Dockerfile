# Multi-stage build for a Next.js app on Azure Container Apps.
# SKELETON — review before production. Assumes `output: 'standalone'` in next.config.js.
# Requires a package.json + app (created during /new-feature F-001); this won't build on the bare template.

# --- deps ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client and build the standalone output.
RUN npx prisma generate
RUN npm run build

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Run as non-root.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Next.js standalone output bundles a minimal server + only the needed node_modules.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma engine + migrations needed at runtime if you run migrate from the container.
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
