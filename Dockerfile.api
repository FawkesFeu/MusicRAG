FROM node:20-alpine AS base

# Install PNPM v9 matching lockfileVersion 9.0
RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY sample_dataset ./sample_dataset

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @rag/shared build
RUN pnpm --filter @rag/api build

ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
