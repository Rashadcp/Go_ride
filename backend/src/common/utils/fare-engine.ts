const roundCurrency = (value: number) => Number(value.toFixed(2));

type VehicleType = "bike" | "auto" | "go" | "sedan" | "xl" | "car";

type DiscountInput = {
  type: "PERCENTAGE" | "FLAT";
  value: number;
};

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

export const calculateDiscountedAmount = (
  originalAmount: number,
  discount: DiscountInput
) => {
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
    return 0;
  }

  if (discount.type === "PERCENTAGE") {
    return roundCurrency(
      Math.max(0, originalAmount - originalAmount * (discount.value / 100))
    );
  }

  return roundCurrency(Math.max(0, originalAmount - discount.value));
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

  const privateFare = roundCurrency(
    Math.max(
      profile.minimumFare,
      profile.baseFare + distance * profile.ratePerKm + duration * profile.ratePerMinute
    )
  );

  if (!isSharedRide) {
    return {
      privateFare,
      totalFare: privateFare,
      perSeatFare: privateFare,
      seatCount: 1,
    };
  }

  const sharedBudget = privateFare * 0.72;
  const perSeatFare = roundCurrency(
    Math.max(profile.minimumSharedSeatFare, sharedBudget / normalizedSeatCount)
  );

  return {
    privateFare,
    totalFare: roundCurrency(perSeatFare * normalizedSeatCount),
    perSeatFare,
    seatCount: normalizedSeatCount,
  };
};

export const roundMoney = roundCurrency;
