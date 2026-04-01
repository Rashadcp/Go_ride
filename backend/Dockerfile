# Base image for shared dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 5001
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS prod
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
# Expects transpiled code if using dist
EXPOSE 5001
CMD ["node", "dist/server.js"]