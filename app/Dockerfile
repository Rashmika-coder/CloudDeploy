# ==========================================
# STAGE 1: Build & Install Dependencies
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package configurations
COPY package*.json ./

# Install dev and production dependencies
RUN npm ci

# Copy application files
COPY . .

# (Optional) Run tests or linting checks to validate build
# RUN npm run lint
# RUN npm test

# Prune devDependencies to keep container size minimal
RUN npm prune --production

# ==========================================
# STAGE 2: Secure Production Container
# ==========================================
FROM node:18-alpine AS runner

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /usr/src/app

# Copy production artifacts from builder
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/public ./public

# Use the non-root 'node' user provided by Node Alpine image for security
USER node

# Expose server port
EXPOSE 3000

# Start application
CMD ["node", "src/app.js"]
