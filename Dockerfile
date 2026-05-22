# Runtime-only image — build on host with ./deploy.sh, then docker compose up
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY .next/standalone/ ./
COPY prisma/ ./prisma/

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && \
    chown -R nextjs:nodejs /app

EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0" DATABASE_URL="file:/app/data/projecthub.db"

USER nextjs
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss 2>&1; node server.js"]
