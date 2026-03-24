import { Response } from "express";
import Transaction from "../../models/transaction";
import Ride from "../../models/ride";
import User from "../../models/user";

export const createPayment = async (req: any, res: Response) => {
    try {
        const { rideId, amount, method } = req.body;
        const transaction = new Transaction({
            userId: req.user.id,
            rideId,
            amount,
            type: 'DEBIT',
            description: `Payment for ride ${rideId}`,
            status: 'PENDING',
            method: method || 'WALLET'
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (err: any) {
        res.status(500).json({ message: "Error initiating payment" });
    }
};

export const verifyPayment = async (req: any, res: Response) => {
    try {
        const { transactionId, status } = req.body;
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });

        transaction.status = status;
        await transaction.save();

        if (status === 'SUCCESS') {
            // Update user balance if wallet
            if (transaction.method === 'WALLET') {
                const user = await User.findById(transaction.userId);
                if (user) {
                    (user as any).walletBalance -= transaction.amount;
                    await user.save();
                }
            }
        }

        res.json({ message: "Payment verified", transaction });
    } catch (err: any) {
        res.status(500).json({ message: "Error verifying payment" });
    }
};
