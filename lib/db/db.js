const mongoose = require("mongoose");
// const { MongoMemoryServer } = require("mongodb-memory-server"); // Removed for production build safety
require("dotenv").config();

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    // Try connecting to the provided URI first
    try {
      console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s if can't connect
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.warn(`Failed to connect to primary MongoDB URI: ${err.message}`);
      // process.exit(1); // Optional: Exit if DB is critical
      return; // Stop execution if connection failed
    }
    
    // Seed test data if needed? No, let's keep it clean or maybe user registration is enough.
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
