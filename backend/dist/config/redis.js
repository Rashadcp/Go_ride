"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnections = exports.setCache = exports.getCache = exports.getRedisClient = exports.isRedisReady = exports.configureSocketRedisAdapter = exports.connectRedis = void 0;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const memoryCache = new Map();
let redisClient = null;
let redisPubClient = null;
let redisSubClient = null;
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
const attachRedisLogging = (client, name) => {
    client.on("error", (error) => {
        console.error(`[redis:${name}]`, error.message);
    });
};
const connectRedis = async () => {
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
        redisClient = (0, redis_1.createClient)(options);
        attachRedisLogging(redisClient, "client");
        await redisClient.connect();
        redisReady = true;
        console.log("Redis connected");
        return redisClient;
    }
    catch (error) {
        redisClient = null;
        redisReady = false;
        console.error("Redis connection failed. Falling back to in-memory cache/state.", error);
        return null;
    }
};
exports.connectRedis = connectRedis;
const configureSocketRedisAdapter = async (io) => {
    const options = getRedisOptions();
    if (!options) {
        return false;
    }
    try {
        redisPubClient = (0, redis_1.createClient)(options);
        redisSubClient = redisPubClient.duplicate();
        attachRedisLogging(redisPubClient, "pub");
        attachRedisLogging(redisSubClient, "sub");
        await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);
        io.adapter((0, redis_adapter_1.createAdapter)(redisPubClient, redisSubClient));
        console.log("Socket.IO Redis adapter enabled");
        return true;
    }
    catch (error) {
        redisPubClient = null;
        redisSubClient = null;
        console.error("Socket.IO Redis adapter disabled because Redis setup failed.", error);
        return false;
    }
};
exports.configureSocketRedisAdapter = configureSocketRedisAdapter;
const isRedisReady = () => redisReady && !!redisClient?.isOpen;
exports.isRedisReady = isRedisReady;
const getRedisClient = () => redisClient;
exports.getRedisClient = getRedisClient;
const clearExpiredMemoryKey = (key) => {
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt <= Date.now()) {
        memoryCache.delete(key);
    }
};
const getCache = async (key) => {
    if ((0, exports.isRedisReady)() && redisClient) {
        return redisClient.get(key);
    }
    clearExpiredMemoryKey(key);
    return memoryCache.get(key)?.value ?? null;
};
exports.getCache = getCache;
const setCache = async (key, value, ttlSeconds) => {
    if ((0, exports.isRedisReady)() && redisClient) {
        await redisClient.set(key, value, { EX: ttlSeconds });
        return;
    }
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
};
exports.setCache = setCache;
const closeRedisConnections = async () => {
    const clients = [redisClient, redisPubClient, redisSubClient].filter((client) => !!client?.isOpen);
    await Promise.all(clients.map((client) => client.quit().catch(() => undefined)));
    redisReady = false;
};
exports.closeRedisConnections = closeRedisConnections;
