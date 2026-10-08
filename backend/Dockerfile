# ==============================================================================
# Production Dockerfile for Ashivam Technologies Backend
# Multi-stage, non-root user, optimized for security and performance
# ==============================================================================

# Stage 1: Dependencies & Build
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Minimal Production Runtime
FROM node:22-alpine

LABEL maintainer="Ashivam Technologies <devops@ashivamtechnologies.com>"
LABEL service="ashivam-website-backend"

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /usr/src/app

# Install security updates
RUN apk --no-cache upgrade

# Create non-root user and uploads directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p uploads/resumes && \
    chown -R appuser:appgroup /usr/src/app

# Copy production dependencies from builder
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules

# Copy application source code
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup src ./src

# Switch to unprivileged user
USER appuser

EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
