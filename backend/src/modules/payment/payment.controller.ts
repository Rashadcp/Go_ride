import { Response } from "express";
import Transaction from "../../models/transaction";
import User from "../../models/user";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import { createNotification } from "../../controllers/notification.controller";

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const createPayment = async (req: any, res: Response) => {
    try {
        const { amount, method } = req.body;
        
        // For Wallet Top-up with Online Payment
        if (method === 'RAZORPAY') {
            const options = {
                amount: amount * 100, // Amount in paise
                currency: "INR",
                receipt: `wallet_topup_${Date.now()}`,
            };

            const order = await razorpay.orders.create(options);
            return res.status(201).json({ order, key_id: process.env.RAZORPAY_KEY_ID });
        }

        // Standard flow for ride payments (direct debit/credit if ever needed)
        const transaction = new Transaction({
            userId: req.user.id,
            amount,
            type: 'DEBIT',
            description: `Payment initiation`,
            status: 'PENDING',
            method: method || 'WALLET'
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (err: any) {
        console.error("Payment error:", err);
        res.status(500).json({ message: "Error initiating payment" });
    }
};

export const verifyPayment = async (req: any, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const { rideId, driverId } = req.body;

            // 1. If it's a ride settlement
            if (rideId && driverId) {
                const driver = await User.findById(driverId);
                const passenger = await User.findById(req.user.id);

                if (driver && passenger) {
                    const finalEarned = Math.round(Number(amount) * 0.85); // 15% platform fee
                    driver.walletBalance = (driver.walletBalance || 0) + finalEarned;
                    await driver.save();

                    // Create Transaction for Driver
                    await new Transaction({
                        userId: driverId,
                        rideId: rideId,
                        type: 'CREDIT',
                        amount: finalEarned,
                        description: `Trip settlement (UPI) for Ride ${rideId}`,
                        status: 'SUCCESS',
                        method: 'ONLINE'
                    }).save();
                    
                    await createNotification(driverId, "Payment Received", `You earned ₹${finalEarned} from ride settlement`, "PAYMENT");
                    await createNotification(req.user.id, "Ride Completed", `₹${amount} paid for ride settlement`, "RIDE_UPDATE");

                    // Create Transaction for Passenger (as a debit of the paid amount)
                    await new Transaction({
                        userId: req.user.id,
                        rideId: rideId,
                        type: 'DEBIT',
                        amount: Number(amount),
                        description: `Payment for Ride ${rideId} (UPI)`,
                        status: 'SUCCESS',
                        method: 'ONLINE'
                    }).save();

                    return res.json({ message: "Trip settled successfully", type: 'RIDE_SETTLEMENT' });
                }
            }

            // 2. Default: Wallet top-up
            const user = await User.findById(req.user.id);
            if (user) {
                user.walletBalance = Number(user.walletBalance || 0) + Number(amount);
                await user.save();

                await new Transaction({
                    userId: req.user.id,
                    amount,
                    type: 'CREDIT',
                    description: `Wallet top-up via Razorpay`,
                    status: 'SUCCESS',
                    method: 'ONLINE'
                }).save();
                
                await createNotification(req.user.id, "Wallet Topped Up", `₹${amount} added successfully to your wallet!`, "PAYMENT");

                return res.json({ message: "Payment verified successfully", walletBalance: user.walletBalance, type: 'TOPUP' });
            }
        }
        
        res.status(400).json({ message: "Signature verification failed" });
    } catch (err: any) {
        console.error("Verification error:", err);
        res.status(500).json({ message: "Error verifying payment" });
    }
};

export const getTransactions = async (req: any, res: Response) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(transactions);
    } catch (err: any) {
        console.error("Get transactions error:", err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
};
