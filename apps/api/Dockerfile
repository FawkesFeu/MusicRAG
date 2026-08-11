FROM node:20-alpine AS base

# Install PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy required workspace packages
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY sample_dataset ./sample_dataset

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build shared types package and API package
RUN pnpm --filter @rag/shared build
RUN pnpm --filter @rag/api build

ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
