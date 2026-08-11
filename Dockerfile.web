FROM node:20-alpine AS base

# Install PNPM v9 matching lockfileVersion 9.0
RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @rag/shared build
RUN pnpm --filter @rag/web build

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
