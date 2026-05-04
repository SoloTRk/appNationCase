FROM node:22-alpine AS base

WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma/
RUN npx prisma generate

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY feature-flags.json ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
