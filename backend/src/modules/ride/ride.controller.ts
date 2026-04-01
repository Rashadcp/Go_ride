import { Response } from "express";
import Ride from "../../models/ride";
import User from "../../models/user";
import Rating from "../../models/rating";
import Discount from "../../models/discount";
import Vehicle from "../../models/vehicle";
import Transaction from "../../models/transaction";
import { sendBookingConfirmation } from "../../config/mail";
import { sendWhatsAppConfirmation } from "../../config/twilio";
import mongoose from "mongoose";

// Get user's ride history
export const getUserRides = async (req: any, res: Response) => {
    try {
        const rides = await Ride.find({
            $or: [
                { createdBy: req.user._id },
                { driverId: req.user._id },
                { "passengers.userId": req.user._id }
            ]
        })
        .populate('createdBy', 'name email phone profilePhoto')
        .populate('driverId', 'name email phone profilePhoto rating')
        .sort({ createdAt: -1 });

        // Add vehicle info for each ride if it has a driver
        const ridesWithVehicle = await Promise.all(rides.map(async (ride) => {
            const rideObj: any = ride.toObject();
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
            // Add financial context for UI
            rideObj.originalPrice = rideObj.originalPrice || rideObj.price;
            rideObj.discount = (rideObj.originalPrice && rideObj.originalPrice > rideObj.price) 
                ? (rideObj.originalPrice - rideObj.price) 
                : 0;
            return rideObj;
        }));

        res.json(ridesWithVehicle);
    } catch (err: any) {
        console.error("Get rides error:", err);
        res.status(500).json({ message: "Error fetching rides" });
    }
};

// Get active ride for user
export const getActiveRide = async (req: any, res: Response) => {
    try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const ride = await Ride.findOne({
            $or: [
                { createdBy: req.user._id, status: { $in: ["REQUESTED", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL", "COMPLETED"] } },
                { driverId: req.user._id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL", "COMPLETED"] } },
                { "passengers.userId": req.user._id, status: { $in: ["ACCEPTED", "ARRIVED", "STARTED", "OPEN", "FULL", "COMPLETED"] } }
            ],
            createdAt: { $gte: twelveHoursAgo }
        })
        .populate('createdBy', 'name email phone profilePhoto')
        .populate('driverId', 'name email phone profilePhoto');

        if (ride) {
            const rideObj: any = ride.toObject();
            
            // Helpful fields for frontend
            rideObj.discount = (rideObj.originalPrice && rideObj.originalPrice > rideObj.price) 
                ? (rideObj.originalPrice - rideObj.price) 
                : 0;
            rideObj.fare = rideObj.price; // Alias for UI

            if (ride.driverId) {
                const vehicle = await Vehicle.findOne({ ownerId: (ride.driverId as any)._id });
                if (vehicle) {
                    rideObj.driverId = {
                        ...(rideObj.driverId as any),
                        vehicleNumber: vehicle.numberPlate,
                        vehicleType: vehicle.vehicleType,
                        vehicleModel: vehicle.vehicleModel
                    };
                    rideObj.driverInfo = rideObj.driverId; // Legacy alias
                }
            }
            return res.json(rideObj);
        }

        res.json(null);
    } catch (err: any) {
        console.error("Get active ride error:", err);
        res.status(500).json({ message: "Error fetching active ride" });
    }
};

// Update ride status
export const updateRideStatus = async (req: any, res: Response) => {
    try {
        const { rideId, status, location } = req.body;

        const ride = await Ride.findOne({ rideId });
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        // Check permissions
        if (req.user.role === "DRIVER" && ride.driverId?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to update this ride" });
        }
        if (req.user.role === "USER" && ride.createdBy?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to update this ride" });
        }

        ride.status = status;

        // Set timestamps based on status
        if (status === "ACCEPTED") ride.acceptedAt = new Date();
        if (status === "STARTED") ride.startedAt = new Date();
        if (status === "COMPLETED") ride.completedAt = new Date();
        if (status === "CANCELLED") ride.cancelledAt = new Date();

        // Update driver location if provided
        if (location) {
            ride.driverLocation = location;
        }

        await ride.save();

        // If status becomes ACCEPTED, send confirmation email (Manual API Update Case)
        if (status === "ACCEPTED") {
            try {
                // Fetch info needed for email
                const populatedRide = await Ride.findById(ride._id)
                    .populate('createdBy')
                    .populate('driverId');
                
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

        res.json({ message: "Ride status updated", ride });
    } catch (err: any) {
        console.error("Update ride status error:", err);
        res.status(500).json({ message: "Error updating ride status" });
    }
};

// Cancel ride
export const cancelRide = async (req: any, res: Response) => {
    try {
        const { rideId } = req.body;

        const ride = await Ride.findOne({ rideId });
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        // Check permissions
        if (req.user.role === "DRIVER" && ride.driverId?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to cancel this ride" });
        }
        if (req.user.role === "USER" && ride.createdBy?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to cancel this ride" });
        }

        ride.status = "CANCELLED";
        ride.cancelledAt = new Date();
        await ride.save();

        res.json({ message: "Ride cancelled successfully" });
    } catch (err: any) {
        console.error("Cancel ride error:", err);
        res.status(500).json({ message: "Error cancelling ride" });
    }
};

export const rateRide = async (req: any, res: Response) => {
    try {
        const { rideId, targetId, rating, feedback } = req.body;
        
        // Find ride by user-friendly rideId or database _id
        const ride = await Ride.findOne({ 
            $or: [
                { rideId }, 
                { _id: (rideId && rideId.length === 24) ? rideId : undefined }
            ].filter(q => q._id !== undefined || q.rideId !== undefined) 
        });

        if (!ride) return res.status(404).json({ message: "Ride not found" });

        // Final resolution for targetId (Driver to be rated)
        const finalTargetId = targetId || ride.driverId;
        
        if (!finalTargetId) {
            return res.status(400).json({ message: "Drive info is missing for this trip" });
        }

        const newRating = new Rating({
            rideId: ride._id,
            userId: req.user.id,
            targetId: finalTargetId,
            rating: Number(rating),
            feedback: feedback || ""
        });
        await newRating.save();

        // Update target's average rating
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
    } catch (err: any) {
        console.error("Rate ride error:", err);
        res.status(500).json({ message: "Error saving rating" });
    }
};

// Get active and public discounts for all users
export const getActiveDiscounts = async (req: any, res: Response) => {
    try {
        const discounts = await Discount.find({ 
            active: true, 
            isPublic: true,
            expiryDate: { $gt: new Date() }
        }).sort({ createdAt: -1 });
        
        res.json(discounts);
    } catch (err: any) {
        console.error("Get discounts error:", err);
        res.status(500).json({ message: "Error fetching promotions" });
    }
};

// Validate specific promo code (pre-ride)
export const validatePromoCode = async (req: any, res: Response) => {
    try {
        const { code } = req.params;
        const discount = await Discount.findOne({ 
            code: { $regex: new RegExp(`^${code}$`, 'i') }, 
            active: true, 
            expiryDate: { $gt: new Date() } 
        });
        
        if (!discount) return res.status(404).json({ message: "Invalid or expired promo code" });
        if (discount.currentUsage >= discount.maxUsage) return res.status(400).json({ message: "Promo limit reached" });
        
        res.json(discount);
    } catch (err: any) {
        console.error("Validate promo error:", err);
        res.status(500).json({ message: "Error validating promo code" });
    }
};

// Apply promo code to an existing ride (at paying time)
export const applyPromoCode = async (req: any, res: Response) => {
    try {
        const { rideId, code } = req.body;
        // Search by user-friendly rideId or MongoDB _id for better reliability
        let ride = await Ride.findOne({ rideId });
        if (!ride && /^[a-f\d]{24}$/i.test(rideId)) {
            ride = await Ride.findById(rideId);
        }

        if (!ride) return res.status(404).json({ message: "Ride not found" });
        if (ride.promoCode) return res.status(400).json({ message: "A promo code is already applied to this ride" });

        const discount = await Discount.findOne({ 
            code: { $regex: new RegExp(`^${code}$`, 'i') }, 
            active: true, 
            expiryDate: { $gt: new Date() } 
        });
        
        if (!discount) return res.status(400).json({ message: "Invalid or expired promo code" });
        if (discount.currentUsage >= discount.maxUsage) return res.status(400).json({ message: "Promo code limit reached" });

        // Apply discount to price
        const originalPrice = ride.originalPrice || ride.price;
        let newPrice = originalPrice;
        let ratio = 1;

        if (discount.type === "PERCENTAGE") {
            ratio = 1 - (discount.value / 100);
            newPrice = originalPrice * ratio;
        } else if (discount.type === "FLAT") {
            newPrice = Math.max(0, originalPrice - discount.value);
            ratio = originalPrice > 0 ? newPrice / originalPrice : 0;
        }

        const discountedAmount = originalPrice - Math.round(newPrice);
        const finalPrice = Math.round(newPrice);
        const finalPricePerSeat = ride.pricePerSeat ? Math.round(ride.pricePerSeat * ratio) : undefined;

        // ✅ ATOMIC UPDATE to prevent race conditions (double application refund abuse)
        const updatedRide = await Ride.findOneAndUpdate(
            { 
               _id: ride._id, 
               $or: [{ promoCode: null }, { promoCode: { $exists: false } }] 
            },
            {
               $set: {
                   price: finalPrice,
                   originalPrice: originalPrice,
                   promoCode: discount.code,
                   discountId: discount._id,
                   ...(finalPricePerSeat !== undefined && { pricePerSeat: finalPricePerSeat })
               }
            },
            { new: true }
        );

        if (!updatedRide) {
            return res.status(400).json({ message: "A promo code was already applied during this transaction." });
        }

        // Increment usage in background
        Discount.findByIdAndUpdate(discount._id, { $inc: { currentUsage: 1 } }).catch(console.error);

        // ✅ HANDLE REFUND IF ALREADY PAID VIA WALLET (on completed rides)
        if (updatedRide.status === 'COMPLETED' && updatedRide.paymentMethod === 'WALLET' && discountedAmount > 0) {
            try {
                const passenger = await User.findById(updatedRide.createdBy);
                if (passenger) {
                    passenger.walletBalance = (passenger.walletBalance || 0) + discountedAmount;
                    await passenger.save();

                    await new Transaction({
                        userId: passenger._id,
                        rideId: updatedRide._id,
                        type: 'CREDIT',
                        amount: discountedAmount,
                        description: `Discount refund for Ride ${updatedRide.rideId} (Promo: ${discount.code})`,
                        status: 'SUCCESS',
                        method: 'WALLET'
                    }).save();

                    console.log(`[PROMO REFUND] Credited ₹${discountedAmount} back to passenger ${passenger.name}`);
                }
            } catch (refundErr) {
                console.error("Promo refund error:", refundErr);
            }
        }

        res.json({ 
            message: "Promo code applied successfully", 
            price: updatedRide.price,
            originalPrice: updatedRide.originalPrice,
            discountValue: discount.value,
            discountType: discount.type
        });
        
    } catch (err: any) {
        console.error("Apply promo error:", err);
        res.status(500).json({ message: "Error applying promo code" });
    }
};
