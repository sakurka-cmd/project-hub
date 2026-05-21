FROM oven/bun:1-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY prisma ./prisma/
RUN bunx prisma generate

COPY . .
RUN rm -rf src && bun run build

# standalone already has its own node_modules
RUN cp -r .next/static .next/standalone/.next/static 2>/dev/null; \
    cp -r public .next/standalone/ 2>/dev/null; \
    cp -r prisma .next/standalone/ 2>/dev/null; \
    cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null; \
    rm -rf node_modules .next !.next/standalone src

WORKDIR /app/.next/standalone
RUN addgroup --system --gid 1001 nodejs 2>/dev/null; adduser --system --uid 1001 nextjs 2>/dev/null; chown -R nextjs:nodejs /app

EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

USER nextjs
CMD ["sh", "-c", "npx prisma db push --skip-generate 2>/dev/null; node server.js"]
