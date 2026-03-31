# Production Only (No Build Inside EC2)
FROM node:20-alpine

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm install --only=production

# Copy full project (including dist from local build)
COPY . .

EXPOSE 5001

CMD ["node", "dist/server.js"]