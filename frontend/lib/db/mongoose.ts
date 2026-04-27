import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global._mongooseConnection || { conn: null, promise: null };

global._mongooseConnection = cached;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to frontend/.env.local for Next API routes.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME,
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
