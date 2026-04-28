import { Response } from "express";
import asyncHandler from "express-async-handler";
import Ride from "../../models/ride";
import User from "../../models/user";
import Rating from "../../models/rating";
import Discount from "../../models/discount";
import Vehicle from "../../models/vehicle";
import Transaction from "../../models/transaction";
import { sendBookingConfirmation } from "../../config/mail";
import { sendWhatsAppConfirmation } from "../../config/twilio";
import { calculateDiscountedAmount } from "../../common/utils/ride-pricing";

const throwHttpError = (res: Response, status: number, message: string): never => {
    res.status(status);
    throw new Error(message);
};

// Get user's ride history
export const getUserRides = asyncHandler(async (req: any, res: Response) => {
    const rides = await Ride.find({
        $or: [
            { createdBy: req.user._id },
            { driverId: req.user._id },
            { "passengers.userId": req.user._id }
        ]
    })
        .populate("createdBy", "name email phone profilePhoto")
        .populate("driverId", "name email phone profilePhoto rating")
        .sort({ createdAt: -1 });

    const ridesWithVehicle = await Promise.all(rides.map(async (ride) => {
        const rideObj: any = ride.toObject();

        if (ride.type === "CARPOOL" && String(ride.driverId?._id || ride.driverId) !== String(req.user._id)) {
            const myEntry = ride.passengers.find((p: any) => String(p.userId?._id || p.userId) === String(req.user._id));
            if (myEntry) {
                if (myEntry.distance) rideObj.distance = myEntry.distance;
                if (myEntry.pickup?.label) rideObj.pickup = myEntry.pickup;
                if (myEntry.drop?.label) rideObj.drop = myEntry.drop;
                if (myEntry.tripStatus) rideObj.status = myEntry.tripStatus;
                if (myEntry.paymentMethod) rideObj.paymentMethod = myEntry.paymentMethod;
                if (myEntry.joinedAt) rideObj.joinedAt = myEntry.joinedAt;

                const seatCount = Number(myEntry.seats || 1);
                const seatPrice = Number(ride.pricePerSeat || ride.price || 0);
                if (seatPrice > 0) {
                    rideObj.price = seatPrice * seatCount;
                    rideObj.pricePerSeat = seatPrice;
                }

                if (myEntry.tripStatus === "COMPLETED" && !rideObj.completedAt) {
                    rideObj.completedAt = ride.completedAt || new Date(myEntry.joinedAt || ride.updatedAt || ride.createdAt);
                }
            }
        }

        if (ride.driverId) {
            const vehicle = await Vehicle.findOne({ ownerId: (ride.driverId as any)._id });
            if (vehicle) {
                rideObj.driverId = {
                    ...(rideObj.driverId as any),
                    vehicleNumber: vehicle.numberPlate,
                    vehicleType: vehicle.vehicleType,
                    vehicleModel: vehicle.vehicleModel
                };
            }
        }

        rideObj.originalPrice = rideObj.originalPrice || rideObj.price;
        rideObj.discount = (rideObj.originalPrice && rideObj.originalPrice > rideObj.price)
            ? (rideObj.originalPrice - rideObj.price)
            : 0;
        return rideObj;
    }));

    res.json(ridesWithVehicle);
});

// Get active ride for user
export const getActiveRide = asyncHandler(async (req: any, res: Response) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const ride = await Ride.findOne({
        $or: [
            { createdBy: req.user._id, status: { $in: ["REQUESTED", "PENDING", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL", "COMPLETED"] } },
            { driverId: req.user._id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL", "COMPLETED"] } },
            { "passengers.userId": req.user._id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL", "COMPLETED"] } }
        ],
        createdAt: { $gte: twelveHoursAgo }
    })
        .populate("createdBy", "name email phone profilePhoto")
        .populate("driverId", "name email phone profilePhoto");

    if (!ride) {
        res.json(null);
        return;
    }

    const rideObj: any = ride.toObject();
    const passengerEntry = Array.isArray(rideObj.passengers)
        ? rideObj.passengers.find((passenger: any) => String(passenger.userId?._id || passenger.userId) === String(req.user._id))
        : null;

    rideObj.discount = (rideObj.originalPrice && rideObj.originalPrice > rideObj.price)
        ? (rideObj.originalPrice - rideObj.price)
        : 0;
    rideObj.fare = rideObj.price;
    if (passengerEntry?.tripStatus) {
        rideObj.status = passengerEntry.tripStatus;
    }

    if (ride.driverId) {
        const vehicle = await Vehicle.findOne({ ownerId: (ride.driverId as any)._id });
        if (vehicle) {
            rideObj.driverId = {
                ...(rideObj.driverId as any),
                vehicleNumber: vehicle.numberPlate,
                vehicleType: vehicle.vehicleType,
                vehicleModel: vehicle.vehicleModel
            };
            rideObj.driverInfo = rideObj.driverId;
        }
    }

    res.json(rideObj);
});

// Update ride status
export const updateRideStatus = asyncHandler(async (req: any, res: Response) => {
    const { rideId, status, location } = req.body;

    const ride = await Ride.findOne({ rideId });
    if (!ride) {
        throwHttpError(res, 404, "Ride not found");
    }
    const rideDoc = ride as NonNullable<typeof ride>;

    if (req.user.role === "DRIVER" && rideDoc.driverId?.toString() !== req.user.id) {
        throwHttpError(res, 403, "Not authorized to update this ride");
    }
    if (req.user.role === "USER" && rideDoc.createdBy?.toString() !== req.user.id) {
        throwHttpError(res, 403, "Not authorized to update this ride");
    }

    rideDoc.status = status;

    if (status === "ACCEPTED") rideDoc.acceptedAt = new Date();
    if (status === "STARTED") rideDoc.startedAt = new Date();
    if (status === "COMPLETED") rideDoc.completedAt = new Date();
    if (status === "CANCELLED") rideDoc.cancelledAt = new Date();

    if (location) {
        rideDoc.driverLocation = location;
    }

    await rideDoc.save();

    if (status === "ACCEPTED") {
        try {
            const populatedRide = await Ride.findById(rideDoc._id)
                .populate("createdBy")
                .populate("driverId");

            if (populatedRide) {
                const passenger = populatedRide.createdBy as any;
                const driver = populatedRide.driverId as any;
                if (passenger && (passenger.email || passenger.phone)) {
                    const vehicle = await Vehicle.findOne({ ownerId: driver?._id });
                    const details = {
                        rideId: populatedRide.rideId,
                        pickup: populatedRide.pickup?.label || "Current Location",
                        destination: populatedRide.drop?.label || "Selected Destination",
                        fare: populatedRide.price,
                        driverName: driver?.name || "Your Driver",
                        vehicleInfo: vehicle ? `${vehicle.vehicleModel} (${vehicle.numberPlate})` : "Standard Vehicle"
                    };

                    if (passenger.email) {
                        await sendBookingConfirmation(passenger.email, details);
                    }

                    if (passenger.phone) {
                        await sendWhatsAppConfirmation(passenger.phone, details);
                    }
                }
            }
        } catch (emailErr) {
            console.error("Booking email trigger error (API):", emailErr);
        }
    }

    res.json({ message: "Ride status updated", ride: rideDoc });
});

// Cancel ride
export const cancelRide = asyncHandler(async (req: any, res: Response) => {
    const { rideId } = req.body;

    const ride = await Ride.findOne({ rideId });
    if (!ride) {
        throwHttpError(res, 404, "Ride not found");
    }
    const rideDoc = ride as NonNullable<typeof ride>;

    if (req.user.role === "DRIVER" && rideDoc.driverId?.toString() !== req.user.id) {
        throwHttpError(res, 403, "Not authorized to cancel this ride");
    }
    if (req.user.role === "USER" && rideDoc.createdBy?.toString() !== req.user.id) {
        throwHttpError(res, 403, "Not authorized to cancel this ride");
    }

    rideDoc.status = "CANCELLED";
    rideDoc.cancelledAt = new Date();
    await rideDoc.save();

    res.json({ message: "Ride cancelled successfully" });
});

export const rateRide = asyncHandler(async (req: any, res: Response) => {
    const { rideId, targetId, rating, feedback } = req.body;

    const ride = await Ride.findOne({
        $or: [
            { rideId },
            { _id: (rideId && rideId.length === 24) ? rideId : undefined }
        ].filter((query) => query._id !== undefined || query.rideId !== undefined)
    });

    if (!ride) {
        throwHttpError(res, 404, "Ride not found");
    }
    const rideDoc = ride as NonNullable<typeof ride>;

    const finalTargetId = targetId || rideDoc.driverId;
    if (!finalTargetId) {
        throwHttpError(res, 400, "Drive info is missing for this trip");
    }

    const newRating = new Rating({
        rideId: rideDoc._id,
        userId: req.user.id,
        targetId: finalTargetId,
        rating: Number(rating),
        feedback: feedback || ""
    });
    await newRating.save();

    const targetUser = await User.findById(finalTargetId);
    if (targetUser) {
        const ratings = await Rating.find({ targetId: finalTargetId });
        const totalScore = ratings.reduce((acc, curr) => acc + curr.rating, 0);
        const avgRating = totalScore / ratings.length;

        targetUser.rating = Math.round(avgRating * 10) / 10;
        targetUser.totalRides = (targetUser.totalRides || 0) + 1;
        await targetUser.save();
    }

    res.json({ message: "Thank you for your feedback!", avgRating: targetUser?.rating });
});

export const getActiveDiscounts = asyncHandler(async (_req: any, res: Response) => {
    const discounts = await Discount.find({
        active: true,
        isPublic: true,
        expiryDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json(discounts);
});

export const validatePromoCode = asyncHandler(async (req: any, res: Response) => {
    const { code } = req.params;
    const discount = await Discount.findOne({
        code: { $regex: new RegExp(`^${code}$`, "i") },
        active: true,
        expiryDate: { $gt: new Date() }
    });

    if (!discount) {
        throwHttpError(res, 404, "Invalid or expired promo code");
    }
    const discountDoc = discount as NonNullable<typeof discount>;
    if (discountDoc.currentUsage >= discountDoc.maxUsage) {
        throwHttpError(res, 400, "Promo limit reached");
    }

    res.json(discountDoc);
});

export const applyPromoCode = asyncHandler(async (req: any, res: Response) => {
    const { rideId, code } = req.body;

    let ride = await Ride.findOne({ rideId });
    if (!ride && /^[a-f\d]{24}$/i.test(rideId)) {
        ride = await Ride.findById(rideId);
    }

    if (!ride) {
        throwHttpError(res, 404, "Ride not found");
    }
    const rideDoc = ride as NonNullable<typeof ride>;
    if (rideDoc.promoCode) {
        throwHttpError(res, 400, "A promo code is already applied to this ride");
    }

    const discount = await Discount.findOne({
        code: { $regex: new RegExp(`^${code}$`, "i") },
        active: true,
        expiryDate: { $gt: new Date() }
    });

    if (!discount) {
        throwHttpError(res, 400, "Invalid or expired promo code");
    }
    const discountDoc = discount as NonNullable<typeof discount>;
    if (discountDoc.currentUsage >= discountDoc.maxUsage) {
        throwHttpError(res, 400, "Promo code limit reached");
    }

    const originalPrice = rideDoc.originalPrice || rideDoc.price;
    const roundedPrice = Math.round(calculateDiscountedAmount(originalPrice, {
        type: discountDoc.type,
        value: discountDoc.value
    }));
    const discountedAmount = originalPrice - roundedPrice;
    const originalPricePerSeat = rideDoc.originalPricePerSeat || rideDoc.pricePerSeat;
    const finalPricePerSeat = originalPricePerSeat
        ? Math.round(calculateDiscountedAmount(originalPricePerSeat, {
            type: discountDoc.type,
            value: discountDoc.value
        }))
        : undefined;

    const updatedRide = await Ride.findOneAndUpdate(
        {
            _id: rideDoc._id,
            $or: [{ promoCode: null }, { promoCode: { $exists: false } }]
        },
        {
            $set: {
                price: roundedPrice,
                originalPrice,
                ...(originalPricePerSeat !== undefined && { originalPricePerSeat }),
                promoCode: discountDoc.code,
                discountId: discountDoc._id,
                ...(finalPricePerSeat !== undefined && { pricePerSeat: finalPricePerSeat })
            }
        },
        { new: true }
    );

    if (!updatedRide) {
        throwHttpError(res, 400, "A promo code was already applied during this transaction.");
    }
    const updatedRideDoc = updatedRide as NonNullable<typeof updatedRide>;

    Discount.findByIdAndUpdate(discountDoc._id, { $inc: { currentUsage: 1 } }).catch(console.error);

    if (updatedRideDoc.status === "COMPLETED" && updatedRideDoc.paymentMethod === "WALLET" && discountedAmount > 0) {
        try {
            const passenger = await User.findById(updatedRideDoc.createdBy);
            if (passenger) {
                passenger.walletBalance = (passenger.walletBalance || 0) + discountedAmount;
                await passenger.save();

                await new Transaction({
                    userId: passenger._id,
                    rideId: updatedRideDoc._id,
                    type: "CREDIT",
                    amount: discountedAmount,
                    description: `Discount refund for Ride ${updatedRideDoc.rideId} (Promo: ${discountDoc.code})`,
                    status: "SUCCESS",
                    method: "WALLET"
                }).save();

                console.log(`[PROMO REFUND] Credited Rs${discountedAmount} back to passenger ${passenger.name}`);
            }
        } catch (refundErr) {
            console.error("Promo refund error:", refundErr);
        }
    }

    res.json({
        message: "Promo code applied successfully",
        price: updatedRideDoc.price,
        originalPrice: updatedRideDoc.originalPrice,
        discountValue: discountDoc.value,
        discountType: discountDoc.type
    });
});
