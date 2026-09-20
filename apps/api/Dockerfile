# Build from the monorepo root:
#   docker build -f apps/api/Dockerfile -t panda-api .
FROM node:20-alpine

WORKDIR /app

# Install workspace dependencies first for better layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @pandago/api --workspace @pandago/shared --include-workspace-root=false

COPY packages/shared packages/shared
COPY apps/api apps/api

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api
CMD ["npx", "tsx", "src/index.ts"]
