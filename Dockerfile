# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
# Point your app to the public Fineract URL to avoid CORS
ARG VITE_API_BASE=https://fineract.kazy.co.tz/fineract-provider
ENV VITE_API_BASE=$VITE_API_BASE
COPY . .
RUN npm run build

# Serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# history fallback + basic security headers
RUN <<'NGINXCONF' cat >/etc/nginx/conf.d/default.conf
server {
  listen 80 default_server;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Optional: If you prefer /api proxy instead of VITE_API_BASE,
  # uncomment the below and point client to /api
  # location /api/ {
  #   proxy_pass http://fineract-server.kazy-prod.svc.cluster.local:8080/fineract-provider/;
  #   proxy_set_header Host $host;
  #   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  #   proxy_http_version 1.1;
  #   proxy_set_header Connection "";
  # }
}
NGINXCONF
