import { Response } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import { createNotification } from "../notification/notification.controller";
import Ride from "../../models/ride";
import Transaction from "../../models/transaction";
import User from "../../models/user";
import { recalculateRideCheckoutAmount } from "../../common/utils/ride-pricing";

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

const PLATFORM_FEE_RATE = 0.25;

const normalizeAmount = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Number(parsed.toFixed(2));
};

const findRideByIdentifier = async (rideIdentifier?: string) => {
    if (!rideIdentifier) return null;

    let ride = await Ride.findOne({ rideId: rideIdentifier });
    if (!ride && /^[a-f\d]{24}$/i.test(rideIdentifier)) {
        ride = await Ride.findById(rideIdentifier);
    }

    return ride;
};

export const createPayment = asyncHandler(async (req: any, res: Response) => {
    const { amount, method, rideId, driverId } = req.body;
    const normalizedAmount = normalizeAmount(amount);

    if (!normalizedAmount) {
        res.status(400);
        throw new Error("Please provide a valid payment amount.");
    }

    if (method === "RAZORPAY") {
        let receipt = `wallet_topup_${Date.now()}`;
        let description = "Wallet top-up";
        let expectedAmount: number | null = null;
        let checkoutDiscountAmount = 0;
        const notes: Record<string, string> = {
            purpose: "WALLET_TOPUP",
            userId: String(req.user.id),
        };

        if (rideId) {
            const ride = await findRideByIdentifier(rideId);
            if (!ride) {
                res.status(404);
                throw new Error("Ride not found for payment.");
            }

            const finalDriverId = ride.driverId || (ride.type === "CARPOOL" ? ride.createdBy : null);
            
            if (!finalDriverId) {
                res.status(400);
                throw new Error("Driver is not assigned to this ride yet.");
            }

            if (driverId && String(finalDriverId) !== String(driverId)) {
                res.status(400);
                throw new Error("Ride payment does not match the assigned driver.");
            }

            const checkout = await recalculateRideCheckoutAmount(ride, req.user.id);
            expectedAmount = checkout.amount;
            checkoutDiscountAmount = checkout.discountAmount;
            if (expectedAmount === null) {
                res.status(403);
                throw new Error("This ride payment is not available for the current user.");
            }

            if (Math.abs(expectedAmount - normalizedAmount) > 0.01) {
                res.status(400).json({
                    message: `Ride payment amount must be ₹${expectedAmount.toFixed(2)}.`,
                    expectedAmount,
                });
                return;
            }

            const existingPayment = await Transaction.findOne({
                userId: req.user.id,
                rideId: ride._id,
                type: "DEBIT",
                method: "ONLINE",
                status: "SUCCESS",
            });

            if (existingPayment) {
                res.status(409).json({ message: "This ride has already been settled online." });
                return;
            }

            receipt = `ride_${ride.rideId}_${Date.now()}`;
            description = `Ride payment for ${ride.rideId}`;
            notes.purpose = "RIDE_SETTLEMENT";
            notes.rideId = ride.rideId;
            notes.rideDbId = String(ride._id);
            notes.driverId = String(finalDriverId);
        }

        const order = await razorpay.orders.create({
            amount: Math.round(normalizedAmount * 100),
            currency: "INR",
            receipt,
            notes,
        });

        res.status(201).json({
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
            paymentContext: {
                amount: normalizedAmount,
                description,
                purpose: notes.purpose,
                expectedAmount,
                discountAmount: checkoutDiscountAmount,
            },
        });
        return;
    }

    const transaction = new Transaction({
        userId: req.user.id,
        amount: normalizedAmount,
        type: "DEBIT",
        description: "Payment initiation",
        status: "PENDING",
        method: method || "WALLET",
    });

    await transaction.save();
    res.status(201).json(transaction);
});

export const verifyPayment = asyncHandler(async (req: any, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, rideId, driverId } = req.body;
    const normalizedAmount = normalizeAmount(amount);

    if (!normalizedAmount) {
        res.status(400);
        throw new Error("Please provide a valid payment amount.");
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        res.status(400);
        throw new Error("Signature verification failed");
    }

    if (rideId) {
        const ride = await findRideByIdentifier(rideId);
        if (!ride) {
            res.status(404);
            throw new Error("Ride not found for verification.");
        }

        const finalDriverId = ride.driverId || (ride.type === "CARPOOL" ? ride.createdBy : null);
        
        if (!finalDriverId) {
            res.status(400);
            throw new Error("This ride does not have an assigned driver yet.");
        }

        if (driverId && String(finalDriverId) !== String(driverId)) {
            res.status(400);
            throw new Error("Ride payment does not match the assigned driver.");
        }

        const checkout = await recalculateRideCheckoutAmount(ride, req.user.id);
        const expectedAmount = checkout.amount;
        if (expectedAmount === null) {
            res.status(403);
            throw new Error("This ride payment is not available for the current user.");
        }

            if (Math.abs(expectedAmount - normalizedAmount) > 0.01) {
                res.status(400).json({
                    message: `Verified amount does not match ride fare. Expected ₹${expectedAmount.toFixed(2)}.`,
                    expectedAmount,
                });
                return;
            }

        const existingPayment = await Transaction.findOne({
            userId: req.user.id,
            rideId: ride._id,
            type: "DEBIT",
            method: "ONLINE",
            status: "SUCCESS",
        });

        if (existingPayment) {
            res.status(409).json({ message: "This ride has already been settled online." });
            return;
        }

        const driver = await User.findById(finalDriverId);
        if (!driver) {
            res.status(404);
            throw new Error("Driver account not found for this ride.");
        }

        const isCarpoolRide = ride.type === "CARPOOL" || ride.isSharedRide;
        const currentFeeRate = isCarpoolRide ? 0.15 : PLATFORM_FEE_RATE;
        const finalEarned = Math.round(expectedAmount * (1 - currentFeeRate));
        driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
        await driver.save();

        if (isCarpoolRide) {
            const passengerEntry: any = ride.passengers?.find(
                (passenger: any) => String(passenger.userId?._id || passenger.userId) === String(req.user.id)
            );
            if (passengerEntry) {
                passengerEntry.paymentStatus = "COMPLETED";
                ride.markModified("passengers");
                await ride.save();
            }
        } else {
            (ride as any).paymentStatus = "COMPLETED";
            await ride.save();
        }

        await new Transaction({
            userId: driver._id,
            rideId: ride._id,
            type: "CREDIT",
            amount: finalEarned,
            description: `Trip settlement via UPI for Ride ${ride.rideId}`,
            status: "SUCCESS",
            method: "ONLINE",
        }).save();

        await new Transaction({
            userId: req.user.id,
            rideId: ride._id,
            type: "DEBIT",
            amount: expectedAmount,
            description: `UPI payment for Ride ${ride.rideId}`,
            status: "SUCCESS",
            method: "ONLINE",
        }).save();

        await createNotification(
            String(driver._id),
            "Payment Received",
            `You earned ₹${finalEarned} from ride ${ride.rideId}.`,
            "PAYMENT"
        );
        await createNotification(
            req.user.id,
            "Ride Payment Completed",
            `₹${expectedAmount} paid successfully for ride ${ride.rideId}.`,
            "PAYMENT"
        );

        res.json({
            message: "Trip settled successfully",
            type: "RIDE_SETTLEMENT",
            settledAmount: expectedAmount,
            driverEarnings: finalEarned,
        });
        return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error("User account not found for payment verification.");
    }

    user.walletBalance = Number(user.walletBalance || 0) + normalizedAmount;
    await user.save();

    await new Transaction({
        userId: req.user.id,
        amount: normalizedAmount,
        type: "CREDIT",
        description: "Wallet top-up via Razorpay",
        status: "SUCCESS",
        method: "ONLINE",
    }).save();

    await createNotification(
        req.user.id,
        "Wallet Topped Up",
        `₹${normalizedAmount} added successfully to your wallet!`,
        "PAYMENT"
    );

    res.json({
        message: "Payment verified successfully",
        walletBalance: user.walletBalance,
        type: "TOPUP",
    });
    return;
});

export const getTransactions = asyncHandler(async (req: any, res: Response) => {
    const transactions = await Transaction.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(20);
    res.json(transactions);
});
