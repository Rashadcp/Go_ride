import { getRedisClient, isRedisReady } from "../config/redis";

export type DriverPresence = {
  driverId: string;
  socketId: string;
  lastSeen: number;
  status: string;
  vehicleType?: string;
  isCarpool?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
};

const DRIVER_HASH_KEY = "goride:drivers:active";
const SOCKET_HASH_KEY = "goride:drivers:sockets";

const activeDriversMemory = new Map<string, DriverPresence>();
const socketToDriverMemory = new Map<string, string>();

const getRedis = () => {
  if (!isRedisReady()) {
    return null;
  }

  return getRedisClient();
};

export const getActiveDrivers = async () => {
  const redis = getRedis();
  if (!redis) {
    return Array.from(activeDriversMemory.values());
  }

  const payload = await redis.hVals(DRIVER_HASH_KEY);
  return payload.map((entry) => JSON.parse(entry) as DriverPresence);
};

export const getAvailableDrivers = async () => {
  const drivers = await getActiveDrivers();
  return drivers.filter((driver) => driver.status === "available");
};

export const getActiveDriver = async (driverId: string) => {
  const redis = getRedis();
  if (!redis) {
    return activeDriversMemory.get(driverId) ?? null;
  }

  const payload = await redis.hGet(DRIVER_HASH_KEY, driverId);
  return payload ? (JSON.parse(payload) as DriverPresence) : null;
};

export const setActiveDriver = async (driverId: string, presence: DriverPresence) => {
  const redis = getRedis();
  if (!redis) {
    activeDriversMemory.set(driverId, presence);
    return;
  }

  await redis.hSet(DRIVER_HASH_KEY, driverId, JSON.stringify(presence));
};

export const removeActiveDriver = async (driverId: string) => {
  const redis = getRedis();
  if (!redis) {
    activeDriversMemory.delete(driverId);
    return;
  }

  await redis.hDel(DRIVER_HASH_KEY, driverId);
};

export const setSocketDriver = async (socketId: string, driverId: string) => {
  const redis = getRedis();
  if (!redis) {
    socketToDriverMemory.set(socketId, driverId);
    return;
  }

  await redis.hSet(SOCKET_HASH_KEY, socketId, driverId);
};

export const getDriverIdBySocket = async (socketId: string) => {
  const redis = getRedis();
  if (!redis) {
    return socketToDriverMemory.get(socketId) ?? null;
  }

  return redis.hGet(SOCKET_HASH_KEY, socketId);
};

export const removeSocketDriver = async (socketId: string) => {
  const redis = getRedis();
  if (!redis) {
    socketToDriverMemory.delete(socketId);
    return;
  }

  await redis.hDel(SOCKET_HASH_KEY, socketId);
};

export const updateDriverStatus = async (driverId: string, status: string) => {
  const currentDriver = await getActiveDriver(driverId);
  if (!currentDriver) {
    return null;
  }

  const nextDriver = {
    ...currentDriver,
    status,
    lastSeen: Date.now(),
  };

  await setActiveDriver(driverId, nextDriver);
  return nextDriver;
};
