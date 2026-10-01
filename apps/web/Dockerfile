# Static PandaGo homepage + web player, served by nginx as-is.
# Build from the monorepo root:
#   docker build -f apps/web/Dockerfile -t panda-web .
# CI puts the latest released APK in apps/web/apk/ before building so the
# homepage download link is same-origin; local builds work without it.
FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web /usr/share/nginx/html
EXPOSE 80
