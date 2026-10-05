# Multi-Stage Build for Angular 22 Frontend with Nginx
FROM node:22-alpine AS builder
WORKDIR /app

# Cache package dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy application source
COPY . .

# Build production distribution bundle
RUN npx ng build --configuration production

# Production Static Web Server (Nginx Unprivileged / Alpine)
FROM nginxinc/nginx-unprivileged:alpine-slim AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static HTML/CSS/JS artifacts from builder
COPY --from=builder /app/dist/student-digital-twin-v1.0.0-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
