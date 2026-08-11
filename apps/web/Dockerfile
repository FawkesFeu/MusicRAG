FROM node:20-alpine AS base

# Install PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy required workspace packages
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build arguments for public client environment
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build shared types package and Next.js web application
RUN pnpm --filter @rag/shared build
RUN pnpm --filter @rag/web build

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
