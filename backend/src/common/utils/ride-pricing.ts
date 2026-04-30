import Discount from "../../models/discount";
import { calculateDiscountedAmount, roundMoney } from "./fare-engine";

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
  const baseSeatPrice = Number(
    passengerEntry?.originalSeatPrice ||
    ride.originalPricePerSeat ||
    ride.pricePerSeat ||
    0
  );

  let effectiveRidePrice = Number(ride.price || baseRidePrice || 0);
  let effectiveSeatPrice = Number(
    passengerEntry?.finalSeatPrice ||
    ride.pricePerSeat ||
    baseSeatPrice ||
    0
  );
  let appliedDiscountAmount = 0;

  if (
    isSharedRide &&
    passengerEntry?.discountId &&
    passengerEntry?.originalSeatPrice
  ) {
    effectiveSeatPrice = Number(passengerEntry.finalSeatPrice || baseSeatPrice || 0);
    appliedDiscountAmount = roundMoney(
      (Number(passengerEntry.originalSeatPrice || 0) - effectiveSeatPrice) * seatCount
    );
  } else if ((ride.discountId || ride.promoCode) && baseRidePrice > 0) {
    const discount = await Discount.findOne({
      $or: [
        ...(ride.discountId ? [{ _id: ride.discountId }] : []),
        ...(ride.promoCode ? [{ code: { $regex: new RegExp(`^${ride.promoCode}$`, "i") } }] : []),
      ],
    }).select("type value");

    if (discount) {
      effectiveRidePrice = calculateDiscountedAmount(baseRidePrice, discount as any);
      appliedDiscountAmount = roundMoney(baseRidePrice - effectiveRidePrice);

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
      amount: roundMoney(effectiveRidePrice),
      discountAmount: roundMoney(appliedDiscountAmount),
    };
  }

  if (passengerEntry) {
    return {
      amount: roundMoney(effectiveSeatPrice * seatCount),
      discountAmount: roundMoney((baseSeatPrice - effectiveSeatPrice) * seatCount),
    };
  }

  if (String(ride.createdBy) === String(userId)) {
    return {
      amount: roundMoney(effectiveSeatPrice || effectiveRidePrice),
      discountAmount: roundMoney(baseSeatPrice - effectiveSeatPrice),
    };
  }

  return {
    amount: null,
    discountAmount: 0,
  };
};
