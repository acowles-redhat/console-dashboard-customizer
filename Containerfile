FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS build
USER 0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json webpack.config.js console-extensions.json ./
COPY src/ src/
RUN npm run build

FROM docker.io/nginxinc/nginx-unprivileged:stable-alpine
USER 0
RUN mkdir -p /opt/styles && chown -R 101:0 /opt/styles
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
USER 101
CMD ["nginx", "-g", "daemon off;"]
