# Navlo frontend — static Vite build served by nginx. Build with
# VITE_API_BASE=<backend URL> baked in (see fly.toml [build.args]), since the
# frontend and backend are deployed as separate Fly apps on different origins.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
