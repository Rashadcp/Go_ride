"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDriverStatus = exports.removeSocketDriver = exports.getDriverIdBySocket = exports.setSocketDriver = exports.removeActiveDriver = exports.setActiveDriver = exports.getActiveDriver = exports.getAvailableDrivers = exports.getActiveDrivers = void 0;
const redis_1 = require("../config/redis");
const DRIVER_HASH_KEY = "goride:drivers:active";
const SOCKET_HASH_KEY = "goride:drivers:sockets";
const activeDriversMemory = new Map();
const socketToDriverMemory = new Map();
const getRedis = () => {
    if (!(0, redis_1.isRedisReady)()) {
        return null;
    }
    return (0, redis_1.getRedisClient)();
};
const getActiveDrivers = async () => {
    const redis = getRedis();
    if (!redis) {
        return Array.from(activeDriversMemory.values());
    }
    const payload = await redis.hVals(DRIVER_HASH_KEY);
    return payload.map((entry) => JSON.parse(entry));
};
exports.getActiveDrivers = getActiveDrivers;
const getAvailableDrivers = async () => {
    const drivers = await (0, exports.getActiveDrivers)();
    return drivers.filter((driver) => driver.status === "available");
};
exports.getAvailableDrivers = getAvailableDrivers;
const getActiveDriver = async (driverId) => {
    const redis = getRedis();
    if (!redis) {
        return activeDriversMemory.get(driverId) ?? null;
    }
    const payload = await redis.hGet(DRIVER_HASH_KEY, driverId);
    return payload ? JSON.parse(payload) : null;
};
exports.getActiveDriver = getActiveDriver;
const setActiveDriver = async (driverId, presence) => {
    const redis = getRedis();
    if (!redis) {
        activeDriversMemory.set(driverId, presence);
        return;
    }
    await redis.hSet(DRIVER_HASH_KEY, driverId, JSON.stringify(presence));
};
exports.setActiveDriver = setActiveDriver;
const removeActiveDriver = async (driverId) => {
    const redis = getRedis();
    if (!redis) {
        activeDriversMemory.delete(driverId);
        return;
    }
    await redis.hDel(DRIVER_HASH_KEY, driverId);
};
exports.removeActiveDriver = removeActiveDriver;
const setSocketDriver = async (socketId, driverId) => {
    const redis = getRedis();
    if (!redis) {
        socketToDriverMemory.set(socketId, driverId);
        return;
    }
    await redis.hSet(SOCKET_HASH_KEY, socketId, driverId);
};
exports.setSocketDriver = setSocketDriver;
const getDriverIdBySocket = async (socketId) => {
    const redis = getRedis();
    if (!redis) {
        return socketToDriverMemory.get(socketId) ?? null;
    }
    return redis.hGet(SOCKET_HASH_KEY, socketId);
};
exports.getDriverIdBySocket = getDriverIdBySocket;
const removeSocketDriver = async (socketId) => {
    const redis = getRedis();
    if (!redis) {
        socketToDriverMemory.delete(socketId);
        return;
    }
    await redis.hDel(SOCKET_HASH_KEY, socketId);
};
exports.removeSocketDriver = removeSocketDriver;
const updateDriverStatus = async (driverId, status) => {
    const currentDriver = await (0, exports.getActiveDriver)(driverId);
    if (!currentDriver) {
        return null;
    }
    const nextDriver = {
        ...currentDriver,
        status,
        lastSeen: Date.now(),
    };
    await (0, exports.setActiveDriver)(driverId, nextDriver);
    return nextDriver;
};
exports.updateDriverStatus = updateDriverStatus;
