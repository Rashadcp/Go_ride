# Base Stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Dev Stage (for instant reflection)
FROM base AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 5001
CMD ["npm", "run", "dev"]

# Build Stage (for production)
FROM base AS builder
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
# If you have static assets like 'uploads', include them
# COPY --from=builder /app/uploads ./uploads

EXPOSE 5001

CMD ["npm", "start"]
