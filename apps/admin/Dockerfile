# Build from the monorepo root:
#   docker build -f apps/admin/Dockerfile --build-arg VITE_API_BASE_URL=https://panda.strikx.dev -t panda-admin .
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/admin/package.json apps/admin/
RUN npm ci --workspace @pandago/admin --workspace @pandago/shared --include-workspace-root=false

COPY packages/shared packages/shared
COPY apps/admin apps/admin

ARG VITE_API_BASE_URL=https://panda.strikx.dev
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build -w apps/admin

FROM nginx:alpine
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
