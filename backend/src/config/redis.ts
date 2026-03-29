import { createAdapter } from "@socket.io/redis-adapter";
import type { Server } from "socket.io";
import { createClient, type RedisClientType } from "redis";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

let redisClient: RedisClientType | null = null;
let redisPubClient: RedisClientType | null = null;
let redisSubClient: RedisClientType | null = null;
let redisReady = false;

const buildRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  if (process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT || "6379";
    const password = process.env.REDIS_PASSWORD;
    return password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;
  }

  return null;
};

const getRedisOptions = () => {
  const url = buildRedisUrl();
  return url ? { url } : null;
};

const attachRedisLogging = (client: RedisClientType, name: string) => {
  client.on("error", (error) => {
    console.error(`[redis:${name}]`, error.message);
  });
};

export const connectRedis = async () => {
  const options = getRedisOptions();

  if (!options) {
    console.warn("Redis configuration not found. Falling back to in-memory cache/state.");
    return null;
  }

  if (redisClient?.isOpen) {
    redisReady = true;
    return redisClient;
  }

  try {
    redisClient = createClient(options);
    attachRedisLogging(redisClient, "client");
    await redisClient.connect();
    redisReady = true;
    console.log("Redis connected");
    return redisClient;
  } catch (error) {
    redisClient = null;
    redisReady = false;
    console.error("Redis connection failed. Falling back to in-memory cache/state.", error);
    return null;
  }
};

export const configureSocketRedisAdapter = async (io: Server) => {
  const options = getRedisOptions();
  if (!options) {
    return false;
  }

  try {
    redisPubClient = createClient(options);
    redisSubClient = redisPubClient.duplicate();
    attachRedisLogging(redisPubClient, "pub");
    attachRedisLogging(redisSubClient, "sub");

    await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);
    io.adapter(createAdapter(redisPubClient, redisSubClient));
    console.log("Socket.IO Redis adapter enabled");
    return true;
  } catch (error) {
    redisPubClient = null;
    redisSubClient = null;
    console.error("Socket.IO Redis adapter disabled because Redis setup failed.", error);
    return false;
  }
};

export const isRedisReady = () => redisReady && !!redisClient?.isOpen;

export const getRedisClient = () => redisClient;

const clearExpiredMemoryKey = (key: string) => {
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
  }
};

export const getCache = async (key: string) => {
  if (isRedisReady() && redisClient) {
    return redisClient.get(key);
  }

  clearExpiredMemoryKey(key);
  return memoryCache.get(key)?.value ?? null;
};

export const setCache = async (key: string, value: string, ttlSeconds: number) => {
  if (isRedisReady() && redisClient) {
    await redisClient.set(key, value, { EX: ttlSeconds });
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const closeRedisConnections = async () => {
  const clients = [redisClient, redisPubClient, redisSubClient].filter(
    (client): client is RedisClientType => !!client?.isOpen
  );

  await Promise.all(clients.map((client) => client.quit().catch(() => undefined)));
  redisReady = false;
};
