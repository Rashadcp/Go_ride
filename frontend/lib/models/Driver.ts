import mongoose, { Schema, type InferSchemaType } from "mongoose";

const vehicleSchema = new Schema(
  {
    type: { type: String, trim: true },
    model: { type: String, trim: true },
    number: { type: String, trim: true },
  },
  { _id: false }
);

const driverSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    totalRides: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5, index: true },
    totalRatings: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    vehicle: vehicleSchema,
  },
  {
    timestamps: true,
    collection: "drivers",
  }
);

driverSchema.index({ status: 1, averageRating: -1, totalRides: -1 });

export type DriverDocument = InferSchemaType<typeof driverSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Driver =
  (mongoose.models.Driver as mongoose.Model<DriverDocument>) ||
  mongoose.model<DriverDocument>("Driver", driverSchema);

export default Driver;
