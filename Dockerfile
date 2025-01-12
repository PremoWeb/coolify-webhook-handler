ARG BUN_VERSION=1.1.42
FROM oven/bun:${BUN_VERSION} AS builder

# Install required dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

COPY --link bun.lockb package.json ./
RUN bun install --ci

# Copy application code
COPY --link . .

FROM oven/bun:${BUN_VERSION}

# Copy curl and x86_64-linux-gnu from the builder stage
COPY --from=builder /usr/bin/curl /usr/bin/curl
COPY --from=builder /usr/lib/x86_64-linux-gnu /usr/lib/x86_64-linux-gnu

# Copy the built application and necessary files from the builder stage
COPY  --chown=bun:bun  --from=builder /app /app

#
ENV PORT=3000
EXPOSE 3000/tcp

# Set user and define healthcheck
USER bun
HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=3 CMD curl --fail http://localhost:3000/

CMD ["bun", "--bun", "/app/server.ts"]