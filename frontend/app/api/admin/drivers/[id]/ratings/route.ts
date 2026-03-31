import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import Driver from "@/lib/models/Driver";
import Rating from "@/lib/models/Rating";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const body = await request.json();

    const userId = String(body?.userId || "");
    const rating = Number(body?.rating);
    const feedback = String(body?.feedback || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid driver id" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: "rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const driver = await Driver.findById(id);
    if (!driver) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    const createdRating = await Rating.create({
      driverId: driver._id,
      userId,
      rating,
      feedback,
    });

    const oldAvg = driver.averageRating || 0;
    const totalRatings = driver.totalRatings || 0;

    const newAvg = ((oldAvg * totalRatings) + rating) / (totalRatings + 1);

    driver.averageRating = Number(newAvg.toFixed(2));
    driver.totalRatings = totalRatings + 1;
    await driver.save();

    return NextResponse.json(
      {
        message: "Rating added successfully",
        rating: createdRating,
        driver: {
          _id: driver._id,
          averageRating: driver.averageRating,
          totalRatings: driver.totalRatings,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/drivers/:id/ratings failed:", error);
    return NextResponse.json({ message: "Failed to add rating" }, { status: 500 });
  }
}
