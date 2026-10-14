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

# Production Static Web Server (Nginx / Alpine)
FROM nginx:stable-alpine AS runner

# Create certificates directory and generate self-signed fallback certificates
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/localhost-key.pem \
      -out /etc/nginx/certs/localhost.pem \
      -subj "/C=PH/ST=Negros Occidental/L=Talisay/O=CHMSU/OU=IT/CN=localhost" && \
    apk del openssl

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static HTML/CSS/JS artifacts from builder
COPY --from=builder /app/dist/student-digital-twin-v1.0.0-frontend/browser /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
