# Static PandaGo homepage + web player, served by nginx as-is.
# Build from the monorepo root:
#   docker build -f apps/web/Dockerfile -t panda-web .
FROM nginx:alpine
COPY apps/web /usr/share/nginx/html
EXPOSE 80
