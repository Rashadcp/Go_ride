const roundCurrency = (value: number) => Math.round(value);

type VehicleType = "bike" | "auto" | "go" | "sedan" | "xl" | "car";

const VEHICLE_PRICING: Record<VehicleType, {
  baseFare: number;
  ratePerKm: number;
  ratePerMinute: number;
  minimumFare: number;
  minimumSharedSeatFare: number;
}> = {
  bike: { baseFare: 25, ratePerKm: 6, ratePerMinute: 1.5, minimumFare: 35, minimumSharedSeatFare: 30 },
  auto: { baseFare: 35, ratePerKm: 9, ratePerMinute: 2, minimumFare: 55, minimumSharedSeatFare: 45 },
  go: { baseFare: 55, ratePerKm: 13, ratePerMinute: 2.5, minimumFare: 80, minimumSharedSeatFare: 65 },
  sedan: { baseFare: 80, ratePerKm: 17, ratePerMinute: 3, minimumFare: 120, minimumSharedSeatFare: 90 },
  xl: { baseFare: 110, ratePerKm: 22, ratePerMinute: 3.5, minimumFare: 160, minimumSharedSeatFare: 115 },
  car: { baseFare: 55, ratePerKm: 13, ratePerMinute: 2.5, minimumFare: 80, minimumSharedSeatFare: 65 },
};

export const getVehiclePricingProfile = (vehicleType?: string) => {
  const normalizedType = (vehicleType || "go").toLowerCase() as VehicleType;
  return VEHICLE_PRICING[normalizedType] || VEHICLE_PRICING.go;
};

export const calculateRideQuote = ({
  vehicleType,
  distanceKm,
  durationMinutes,
  isSharedRide = false,
  seatCount = 1,
}: {
  vehicleType?: string;
  distanceKm?: number;
  durationMinutes?: number;
  isSharedRide?: boolean;
  seatCount?: number;
}) => {
  const profile = getVehiclePricingProfile(vehicleType);
  const distance = Math.max(0, Number(distanceKm || 0));
  const duration = Math.max(0, Number(durationMinutes || 0));
  const normalizedSeatCount = Math.max(1, Number(seatCount || 1));

  const privateFare = Math.max(
    profile.minimumFare,
    profile.baseFare + distance * profile.ratePerKm + duration * profile.ratePerMinute
  );

  if (!isSharedRide) {
    return {
      privateFare: roundCurrency(privateFare),
      totalFare: roundCurrency(privateFare),
      perSeatFare: roundCurrency(privateFare),
      seatCount: 1,
    };
  }

  const sharedBudget = privateFare * 0.72;
  const perSeatFare = Math.max(profile.minimumSharedSeatFare, sharedBudget / normalizedSeatCount);

  return {
    privateFare: roundCurrency(privateFare),
    totalFare: roundCurrency(perSeatFare * normalizedSeatCount),
    perSeatFare: roundCurrency(perSeatFare),
    seatCount: normalizedSeatCount,
  };
};
