import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ratingSchema = new Schema(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: "ratings",
  }
);

ratingSchema.index({ driverId: 1, createdAt: -1 });
ratingSchema.index({ driverId: 1, rating: 1 });

export type RatingDocument = InferSchemaType<typeof ratingSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Rating =
  (mongoose.models.Rating as mongoose.Model<RatingDocument>) ||
  mongoose.model<RatingDocument>("Rating", ratingSchema);

export default Rating;
