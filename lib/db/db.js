const mongoose = require("mongoose");
// const { MongoMemoryServer } = require("mongodb-memory-server"); // Removed for production build safety
require("dotenv").config();

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI or MONGODB_URI is not defined in environment variables",
      );
    }

    // Try connecting to the provided URI first
    try {
      console.log(`Attempting to connect to MongoDB...`);
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);

      // Handle reconnection on disconnect
      mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("MongoDB disconnected. Attempting to reconnect...");
        setTimeout(connectDB, 5000);
      });

      return;
    } catch (err) {
      console.error(`Failed to connect to MongoDB: ${err.message}`);
      if (process.env.NODE_ENV === "production") {
        console.log("Retrying connection in 5 seconds...");
        setTimeout(connectDB, 5000);
      } else {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (process.env.NODE_ENV === "production") {
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

module.exports = { connectDB };
