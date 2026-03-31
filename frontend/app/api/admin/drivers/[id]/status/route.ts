import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import Driver from "@/lib/models/Driver";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const body = await request.json();
    const status = String(body?.status || "").toUpperCase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid driver id" }, { status: 400 });
    }

    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      return NextResponse.json(
        { message: "Status must be ACTIVE or SUSPENDED" },
        { status: 400 }
      );
    }

    const driver = await Driver.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .select("name status")
      .lean();

    if (!driver) {
      return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Driver status updated",
      driver,
    });
  } catch (error) {
    console.error("PATCH /api/admin/drivers/:id/status failed:", error);
    return NextResponse.json(
      { message: "Failed to update driver status" },
      { status: 500 }
    );
  }
}
