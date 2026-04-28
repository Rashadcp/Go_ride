import mongoose from "mongoose";
import Ride from "../../models/ride";
import type { DriverPresence } from "../../sockets/state";

const MAX_DRIVER_MATCH_DISTANCE_KM = 20;
const DEFAULT_TAXI_REQUEST_TTL_MINUTES = 10;
const PENDING_RIDE_STATUSES = ["PENDING", "SEARCHING"];

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getTaxiRequestTtlMinutes = () => {
  const ttlFromEnv = Number(process.env.TAXI_REQUEST_TTL_MINUTES);
  return Number.isFinite(ttlFromEnv) && ttlFromEnv > 0
    ? ttlFromEnv
    : DEFAULT_TAXI_REQUEST_TTL_MINUTES;
};

const isRideVehicleMatch = (requestedVehicleType: string, driverVehicleType?: string) => {
  const normalizedRequestedType = (requestedVehicleType || "").toLowerCase();
  const normalizedDriverType = (driverVehicleType || "").toLowerCase();
  return !normalizedRequestedType || normalizedRequestedType === normalizedDriverType;
};

const buildPendingRideQuery = (params: {
  driverId?: string;
  excludePreviouslyBroadcasted?: boolean;
}) => {
  const { driverId, excludePreviouslyBroadcasted = false } = params;
  const query: Record<string, any> = {
    type: "TAXI",
    status: { $in: PENDING_RIDE_STATUSES },
    $or: [
      { driverId: { $exists: false } },
      { driverId: null },
    ],
    $and: [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      },
    ],
  };

  if (driverId) {
    query.$and.push({
      $or: [
        { candidateDrivers: { $exists: false } },
        { candidateDrivers: { $not: { $elemMatch: { driverId, status: "REJECTED" } } } },
      ],
    });

    if (excludePreviouslyBroadcasted) {
      query.$and.push({
        $or: [
          { broadcastedDrivers: { $exists: false } },
          { broadcastedDrivers: { $nin: [new mongoose.Types.ObjectId(driverId)] } },
        ],
      });
    }
  }

  return query;
};

export const expirePendingRideRequests = async (now = new Date()) => {
  const result = await Ride.updateMany(
    {
      type: "TAXI",
      status: { $in: PENDING_RIDE_STATUSES },
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: "EXPIRED",
        expiredAt: now,
      },
    }
  );

  return result.modifiedCount;
};

export const createPendingTaxiRideRequest = async (payload: Record<string, any>) => {
  const expiresAt = new Date(Date.now() + getTaxiRequestTtlMinutes() * 60 * 1000);

  return Ride.create({
    ...payload,
    type: "TAXI",
    status: "PENDING",
    expiresAt,
    broadcastedDrivers: [],
  });
};

export const rideRequestToDriverPayload = (ride: any) => ({
  rideId: ride.rideId,
  dbId: ride._id,
  passengerId: ride.createdBy,
  passengerName: ride.passengerName,
  passengerPhoto: ride.passengerPhoto,
  pickup: ride.pickup,
  destination: ride.drop,
  fare: ride.price,
  distance: ride.distance,
  duration: ride.duration,
  isSharedRide: ride.isSharedRide,
  createdAt: ride.createdAt,
  expiresAt: ride.expiresAt,
});

export const getEligibleOnlineDriversForRide = async (params: {
  ride: any;
  requestedVehicleType?: string;
  isSharedRide?: boolean;
  availableDrivers: DriverPresence[];
}) => {
  const { ride, requestedVehicleType, isSharedRide, availableDrivers } = params;

  return availableDrivers.filter((driver) => {
    if (!driver.location?.lat || !driver.location?.lng) return false;

    const pickupLat = Number(ride.pickup?.lat);
    const pickupLng = Number(ride.pickup?.lng);
    if (!pickupLat || !pickupLng) return false;

    const distance = getDistanceInKm(
      pickupLat,
      pickupLng,
      driver.location.lat,
      driver.location.lng
    );

    return (
      driver.status === "available" &&
      distance <= MAX_DRIVER_MATCH_DISTANCE_KM &&
      (isSharedRide
        ? driver.isCarpool === true
        : isRideVehicleMatch(requestedVehicleType || ride.requestedVehicleType, driver.vehicleType) &&
          !driver.isCarpool)
    );
  });
};

export const getPendingRideRequestsForDriver = async (params: {
  driverId: string;
  location: { lat: number; lng: number };
  vehicleType?: string;
  excludePreviouslyBroadcasted?: boolean;
}) => {
  const {
    driverId,
    location,
    vehicleType,
    excludePreviouslyBroadcasted = false,
  } = params;

  await expirePendingRideRequests();

  const rides = await Ride.find(
    buildPendingRideQuery({ driverId, excludePreviouslyBroadcasted })
  )
    .sort({ createdAt: -1 })
    .limit(25);

  return rides.filter((ride: any) => {
    const pickupLat = Number(ride.pickup?.lat);
    const pickupLng = Number(ride.pickup?.lng);
    if (!pickupLat || !pickupLng) {
      return false;
    }

    return (
      isRideVehicleMatch(ride.requestedVehicleType, vehicleType) &&
      getDistanceInKm(location.lat, location.lng, pickupLat, pickupLng) <=
        MAX_DRIVER_MATCH_DISTANCE_KM
    );
  });
};

export const markRideRequestsBroadcastedToDriver = async (params: {
  driverId: string;
  rideIds: Array<string | mongoose.Types.ObjectId>;
}) => {
  const { driverId, rideIds } = params;
  if (!rideIds.length) return;

  await Ride.updateMany(
    { _id: { $in: rideIds } },
    {
      $addToSet: {
        broadcastedDrivers: new mongoose.Types.ObjectId(driverId),
      },
    }
  );
};
