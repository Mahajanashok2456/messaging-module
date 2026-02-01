const mongoose = require("mongoose");
require("dotenv").config();

const globalCache = global.mongoose || {
  conn: null,
  promise: null,
  listenersAttached: false,
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI or MONGODB_URI is not defined in environment variables",
    );
  }

  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    console.log("Attempting to connect to MongoDB...");
    globalCache.promise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        globalCache.promise = null;
        throw error;
      });
  }

  globalCache.conn = await globalCache.promise;

  if (!globalCache.listenersAttached) {
    globalCache.listenersAttached = true;

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected.");
      globalCache.conn = null;
      globalCache.promise = null;
    });
  }

  global.mongoose = globalCache;
  return globalCache.conn;
};

module.exports = { connectDB };
