# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
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
