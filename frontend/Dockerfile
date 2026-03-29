# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_AWS_BUCKET_NAME
ARG NEXT_PUBLIC_AWS_REGION
ARG NEXT_PUBLIC_S3_HOSTNAME

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_AWS_BUCKET_NAME=$NEXT_PUBLIC_AWS_BUCKET_NAME
ENV NEXT_PUBLIC_AWS_REGION=$NEXT_PUBLIC_AWS_REGION
ENV NEXT_PUBLIC_S3_HOSTNAME=$NEXT_PUBLIC_S3_HOSTNAME

# Install build-time dependencies
# (Need for some canvas or other special native modules)
# RUN apk add --no-cache libc6-compat

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
# We disable linting during build to avoid failures from dev-only lints
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_AWS_BUCKET_NAME
ARG NEXT_PUBLIC_AWS_REGION
ARG NEXT_PUBLIC_S3_HOSTNAME

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_AWS_BUCKET_NAME=$NEXT_PUBLIC_AWS_BUCKET_NAME
ENV NEXT_PUBLIC_AWS_REGION=$NEXT_PUBLIC_AWS_REGION
ENV NEXT_PUBLIC_S3_HOSTNAME=$NEXT_PUBLIC_S3_HOSTNAME

# Copy built assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# Include next.config.ts if needed (though it might be compiled)
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
