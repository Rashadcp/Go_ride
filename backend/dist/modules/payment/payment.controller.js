"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.verifyPayment = exports.createPayment = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const razorpay_1 = __importDefault(require("razorpay"));
const notification_controller_1 = require("../notification/notification.controller");
const ride_1 = __importDefault(require("../../models/ride"));
const transaction_1 = __importDefault(require("../../models/transaction"));
const user_1 = __importDefault(require("../../models/user"));
dotenv_1.default.config();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});
const PLATFORM_FEE_RATE = 0.25;
const normalizeAmount = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return null;
    return Number(parsed.toFixed(2));
};
const findRideByIdentifier = async (rideIdentifier) => {
    if (!rideIdentifier)
        return null;
    let ride = await ride_1.default.findOne({ rideId: rideIdentifier });
    if (!ride && /^[a-f\d]{24}$/i.test(rideIdentifier)) {
        ride = await ride_1.default.findById(rideIdentifier);
    }
    return ride;
};
const getExpectedRideAmount = (ride, userId) => {
    const isSharedRide = ride.type === "CARPOOL" || ride.isSharedRide;
    if (!isSharedRide) {
        return Number(ride.price || 0);
    }
    const joinedPassenger = ride.passengers?.find((passenger) => String(passenger.userId) === String(userId));
    if (joinedPassenger) {
        const seatCount = Number(joinedPassenger.seats || 1);
        const seatPrice = Number(ride.pricePerSeat || ride.price || 0);
        return Number((seatPrice * seatCount).toFixed(2));
    }
    if (String(ride.createdBy) === String(userId)) {
        return Number(ride.pricePerSeat || ride.price || 0);
    }
    return null;
};
const createPayment = async (req, res) => {
    try {
        const { amount, method, rideId, driverId } = req.body;
        const normalizedAmount = normalizeAmount(amount);
        if (!normalizedAmount) {
            return res.status(400).json({ message: "Please provide a valid payment amount." });
        }
        if (method === "RAZORPAY") {
            let receipt = `wallet_topup_${Date.now()}`;
            let description = "Wallet top-up";
            const notes = {
                purpose: "WALLET_TOPUP",
                userId: String(req.user.id),
            };
            if (rideId) {
                const ride = await findRideByIdentifier(rideId);
                if (!ride) {
                    return res.status(404).json({ message: "Ride not found for payment." });
                }
                if (!ride.driverId) {
                    return res.status(400).json({ message: "Driver is not assigned to this ride yet." });
                }
                if (driverId && String(ride.driverId) !== String(driverId)) {
                    return res.status(400).json({ message: "Ride payment does not match the assigned driver." });
                }
                const expectedAmount = getExpectedRideAmount(ride, req.user.id);
                if (expectedAmount === null) {
                    return res.status(403).json({ message: "This ride payment is not available for the current user." });
                }
                if (Math.abs(expectedAmount - normalizedAmount) > 0.01) {
                    return res.status(400).json({
                        message: `Ride payment amount must be ₹${expectedAmount.toFixed(2)}.`,
                        expectedAmount,
                    });
                }
                const existingPayment = await transaction_1.default.findOne({
                    userId: req.user.id,
                    rideId: ride._id,
                    type: "DEBIT",
                    method: "ONLINE",
                    status: "SUCCESS",
                });
                if (existingPayment) {
                    return res.status(409).json({ message: "This ride has already been settled online." });
                }
                receipt = `ride_${ride.rideId}_${Date.now()}`;
                description = `Ride payment for ${ride.rideId}`;
                notes.purpose = "RIDE_SETTLEMENT";
                notes.rideId = ride.rideId;
                notes.rideDbId = String(ride._id);
                notes.driverId = String(ride.driverId);
            }
            const order = await razorpay.orders.create({
                amount: Math.round(normalizedAmount * 100),
                currency: "INR",
                receipt,
                notes,
            });
            return res.status(201).json({
                order,
                key_id: process.env.RAZORPAY_KEY_ID,
                paymentContext: {
                    amount: normalizedAmount,
                    description,
                    purpose: notes.purpose,
                },
            });
        }
        const transaction = new transaction_1.default({
            userId: req.user.id,
            amount: normalizedAmount,
            type: "DEBIT",
            description: "Payment initiation",
            status: "PENDING",
            method: method || "WALLET",
        });
        await transaction.save();
        res.status(201).json(transaction);
    }
    catch (err) {
        console.error("Payment error:", err);
        res.status(500).json({ message: "Error initiating payment" });
    }
};
exports.createPayment = createPayment;
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, rideId, driverId } = req.body;
        const normalizedAmount = normalizeAmount(amount);
        if (!normalizedAmount) {
            return res.status(400).json({ message: "Please provide a valid payment amount." });
        }
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Signature verification failed" });
        }
        if (rideId) {
            const ride = await findRideByIdentifier(rideId);
            if (!ride) {
                return res.status(404).json({ message: "Ride not found for verification." });
            }
            if (!ride.driverId) {
                return res.status(400).json({ message: "This ride does not have an assigned driver yet." });
            }
            if (driverId && String(ride.driverId) !== String(driverId)) {
                return res.status(400).json({ message: "Ride payment does not match the assigned driver." });
            }
            const expectedAmount = getExpectedRideAmount(ride, req.user.id);
            if (expectedAmount === null) {
                return res.status(403).json({ message: "This ride payment is not available for the current user." });
            }
            if (Math.abs(expectedAmount - normalizedAmount) > 0.01) {
                return res.status(400).json({
                    message: `Verified amount does not match ride fare. Expected ₹${expectedAmount.toFixed(2)}.`,
                    expectedAmount,
                });
            }
            const existingPayment = await transaction_1.default.findOne({
                userId: req.user.id,
                rideId: ride._id,
                type: "DEBIT",
                method: "ONLINE",
                status: "SUCCESS",
            });
            if (existingPayment) {
                return res.status(409).json({ message: "This ride has already been settled online." });
            }
            const driver = await user_1.default.findById(ride.driverId);
            if (!driver) {
                return res.status(404).json({ message: "Driver account not found for this ride." });
            }
            const finalEarned = Math.round(expectedAmount * (1 - PLATFORM_FEE_RATE));
            driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
            await driver.save();
            await new transaction_1.default({
                userId: driver._id,
                rideId: ride._id,
                type: "CREDIT",
                amount: finalEarned,
                description: `Trip settlement via UPI for Ride ${ride.rideId}`,
                status: "SUCCESS",
                method: "ONLINE",
            }).save();
            await new transaction_1.default({
                userId: req.user.id,
                rideId: ride._id,
                type: "DEBIT",
                amount: expectedAmount,
                description: `UPI payment for Ride ${ride.rideId}`,
                status: "SUCCESS",
                method: "ONLINE",
            }).save();
            await (0, notification_controller_1.createNotification)(String(driver._id), "Payment Received", `You earned ₹${finalEarned} from ride ${ride.rideId}.`, "PAYMENT");
            await (0, notification_controller_1.createNotification)(req.user.id, "Ride Payment Completed", `₹${expectedAmount} paid successfully for ride ${ride.rideId}.`, "PAYMENT");
            return res.json({
                message: "Trip settled successfully",
                type: "RIDE_SETTLEMENT",
                settledAmount: expectedAmount,
                driverEarnings: finalEarned,
            });
        }
        const user = await user_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User account not found for payment verification." });
        }
        user.walletBalance = Number(user.walletBalance || 0) + normalizedAmount;
        await user.save();
        await new transaction_1.default({
            userId: req.user.id,
            amount: normalizedAmount,
            type: "CREDIT",
            description: "Wallet top-up via Razorpay",
            status: "SUCCESS",
            method: "ONLINE",
        }).save();
        await (0, notification_controller_1.createNotification)(req.user.id, "Wallet Topped Up", `₹${normalizedAmount} added successfully to your wallet!`, "PAYMENT");
        return res.json({
            message: "Payment verified successfully",
            walletBalance: user.walletBalance,
            type: "TOPUP",
        });
    }
    catch (err) {
        console.error("Verification error:", err);
        res.status(500).json({ message: "Error verifying payment" });
    }
};
exports.verifyPayment = verifyPayment;
const getTransactions = async (req, res) => {
    try {
        const transactions = await transaction_1.default.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(transactions);
    }
    catch (err) {
        console.error("Get transactions error:", err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
};
exports.getTransactions = getTransactions;
