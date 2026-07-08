/**
 * MongoDB Atlas connection (cached for serverless + local dev)
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let connectionPromise = null;

function getUri() {
  if (!MONGODB_URI?.trim()) {
    throw new Error(
      "MONGODB_URI is not set. Add your MongoDB Atlas connection string to .env or Vercel environment variables.",
    );
  }
  return MONGODB_URI.trim();
}

/**
 * Connect to MongoDB Atlas. Reuses an open connection across warm invocations.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    const uri = getUri();
    mongoose.set("strictQuery", true);

    connectionPromise = mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then(async (conn) => {
      const { migrateLegacyUsersIfEmpty } = await import("./migrate-legacy-users.js");
      await migrateLegacyUsersIfEmpty();
      console.log("[mongodb] Connected to Atlas");
      return conn;
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }

  return connectionPromise;
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export function getMongoStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}