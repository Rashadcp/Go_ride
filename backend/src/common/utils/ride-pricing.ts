import Discount from "../../models/discount";

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const calculateDiscountedAmount = (
  originalAmount: number,
  discount: { type: "PERCENTAGE" | "FLAT"; value: number }
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

export const recalculateRideCheckoutAmount = async (ride: any, userId: string) => {
  const isSharedRide = ride.type === "CARPOOL" || ride.isSharedRide;
  const passengerEntry = Array.isArray(ride.passengers)
    ? ride.passengers.find(
        (passenger: any) =>
          String(passenger.userId?._id || passenger.userId) === String(userId)
      )
    : null;

  const seatCount = passengerEntry ? Number(passengerEntry.seats || 1) : 1;
  const baseRidePrice = Number(ride.originalPrice || ride.price || 0);
  const baseSeatPrice = Number(ride.originalPricePerSeat || ride.pricePerSeat || 0);

  let effectiveRidePrice = Number(ride.price || baseRidePrice || 0);
  let effectiveSeatPrice = Number(ride.pricePerSeat || baseSeatPrice || 0);
  let appliedDiscountAmount = 0;

  if ((ride.discountId || ride.promoCode) && baseRidePrice > 0) {
    const discount = await Discount.findOne({
      $or: [
        ...(ride.discountId ? [{ _id: ride.discountId }] : []),
        ...(ride.promoCode ? [{ code: { $regex: new RegExp(`^${ride.promoCode}$`, "i") } }] : []),
      ],
    }).select("type value");

    if (discount) {
      effectiveRidePrice = calculateDiscountedAmount(baseRidePrice, discount as any);
      appliedDiscountAmount = roundCurrency(baseRidePrice - effectiveRidePrice);

      if (isSharedRide && baseSeatPrice > 0) {
        effectiveSeatPrice = calculateDiscountedAmount(baseSeatPrice, discount as any);
      }

      const updatePayload: Record<string, number> = {};
      if (Number(ride.price || 0) !== effectiveRidePrice) {
        updatePayload.price = effectiveRidePrice;
      }
      if (
        isSharedRide &&
        baseSeatPrice > 0 &&
        Number(ride.pricePerSeat || 0) !== effectiveSeatPrice
      ) {
        updatePayload.pricePerSeat = effectiveSeatPrice;
      }

      if (Object.keys(updatePayload).length > 0) {
        await ride.updateOne({ $set: updatePayload });
        Object.assign(ride, updatePayload);
      }
    }
  }

  if (!isSharedRide) {
    return {
      amount: roundCurrency(effectiveRidePrice),
      discountAmount: roundCurrency(appliedDiscountAmount),
    };
  }

  if (passengerEntry) {
    return {
      amount: roundCurrency(effectiveSeatPrice * seatCount),
      discountAmount: roundCurrency((baseSeatPrice - effectiveSeatPrice) * seatCount),
    };
  }

  if (String(ride.createdBy) === String(userId)) {
    return {
      amount: roundCurrency(effectiveSeatPrice || effectiveRidePrice),
      discountAmount: roundCurrency(baseSeatPrice - effectiveSeatPrice),
    };
  }

  return {
    amount: null,
    discountAmount: 0,
  };
};
