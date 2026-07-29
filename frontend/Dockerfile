# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the production static bundle
# VITE_API_BASE_URL and VITE_SOCKET_URL are passed as build args
# so Nginx can proxy everything through a single origin
ARG VITE_API_BASE_URL=/api
ARG VITE_SOCKET_URL=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ── Stage 2: Nginx Server ─────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default nginx site config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
