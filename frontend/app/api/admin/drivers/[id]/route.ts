import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import Driver from "@/lib/models/Driver";
import Rating from "@/lib/models/Rating";
import "@/lib/models/User";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    await connectToDatabase();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid driver id" }, { status: 400 });
    }

    const driver = await Driver.findById(id)
      .select("name phone totalRides averageRating totalRatings status vehicle")
      .lean();

    if (!driver) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    const breakdownRaw = await Rating.aggregate([
      { $match: { driverId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      rating: star,
      count: breakdownRaw.find((item) => item._id === star)?.count || 0,
    }));

    const reviews = await Rating.find({ driverId: id })
      .select("rating feedback createdAt userId")
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedReviews = reviews.map((review: any) => ({
      id: review._id,
      rating: review.rating,
      feedback: review.feedback,
      createdAt: review.createdAt,
      userName: review.userId?.name || "Anonymous User",
    }));

    return NextResponse.json({
      driver,
      breakdown,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("GET /api/admin/drivers/:id failed:", error);
    return NextResponse.json(
      { message: "Failed to fetch driver details" },
      { status: 500 }
    );
  }
}
