# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Native deps for node modules that compile binaries
RUN apk add --no-cache python3 make g++ git

# Install deps first for better caching
COPY package*.json ./
RUN npm ci || npm install

# --- Vite envs (match your .env naming!) ---
# These ENV vars are read by Vite at build time as import.meta.env.VITE_*
ARG VITE_API_URL=https://fineract.kazy.co.tz/fineract-provider
ARG VITE_TENANT=default
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT=$VITE_TENANT

# Increase memory for large builds (optional)
ENV NODE_OPTIONS="--max_old_space_size=1536"

# Copy source (includes .env so defaults also exist)
COPY . .

# Debug in CI logs
RUN echo ">>> VITE_API_URL=${VITE_API_URL}" && echo ">>> VITE_TENANT=${VITE_TENANT}"

# Build
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine
# Replace default site
RUN rm -f /etc/nginx/conf.d/default.conf || true
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static SPA
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
