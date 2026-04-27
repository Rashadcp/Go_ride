import Ride from "../../models/ride";

const MAX_DRIVER_MATCH_DISTANCE_KM = 20;

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

export const getPendingRideRequestsForDriver = async (params: {
  driverId: string;
  location: { lat: number; lng: number };
  vehicleType?: string;
}) => {
  const { driverId, location, vehicleType } = params;
  const normalizedVehicleType = (vehicleType || "").toLowerCase();

  const rides = await Ride.find({
    type: "TAXI",
    status: "SEARCHING",
    driverId: { $exists: false },
    $or: [
      { candidateDrivers: { $exists: false } },
      { candidateDrivers: { $not: { $elemMatch: { driverId, status: "REJECTED" } } } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(25);

  return rides
    .filter((ride: any) => {
      const pickupLat = Number(ride.pickup?.lat);
      const pickupLng = Number(ride.pickup?.lng);
      if (!pickupLat || !pickupLng) {
        return false;
      }

      const rideVehicleType = (ride.requestedVehicleType || "").toLowerCase();
      const vehicleMatches =
        !normalizedVehicleType || rideVehicleType === normalizedVehicleType;

      return (
        vehicleMatches &&
        getDistanceInKm(location.lat, location.lng, pickupLat, pickupLng) <=
          MAX_DRIVER_MATCH_DISTANCE_KM
      );
    })
    .map((ride: any) => ({
      rideId: ride.rideId,
      dbId: ride._id,
      passengerId: ride.createdBy,
      pickup: ride.pickup,
      destination: ride.drop,
      fare: ride.price,
      distance: ride.distance,
      duration: ride.duration,
      isSharedRide: ride.isSharedRide,
      createdAt: ride.createdAt,
    }));
};
