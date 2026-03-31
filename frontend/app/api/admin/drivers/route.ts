import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import Driver from "@/lib/models/Driver";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page")) || DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const search = (searchParams.get("search") || "").trim();
    const ratingFilter = (searchParams.get("ratingFilter") || "all").toLowerCase();
    const statusFilter = (searchParams.get("status") || "all").toUpperCase();

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (statusFilter === "ACTIVE" || statusFilter === "SUSPENDED") {
      query.status = statusFilter;
    }

    if (ratingFilter === "high") {
      query.averageRating = { $gte: 4.5 };
    } else if (ratingFilter === "low") {
      query.averageRating = { $lt: 3 };
    }

    const total = await Driver.countDocuments(query);

    const drivers = await Driver.find(query)
      .select("name phone totalRides averageRating totalRatings status")
      .sort({ averageRating: -1, totalRides: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = drivers.map((driver) => ({
      ...driver,
      isTopDriver:
        driver.status === "ACTIVE" &&
        driver.averageRating >= 4.8 &&
        driver.totalRides >= 50,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/drivers failed:", error);
    return NextResponse.json(
      { message: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}
