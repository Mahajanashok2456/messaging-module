/**
 * Script to remove duplicate chats from the database
 * Run with: node scripts/cleanup-duplicate-chats.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Chat = require("../lib/db/Chat");
const { connectDB } = require("../lib/db/db");

async function cleanupDuplicateChats() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Get all chats
    const allChats = await Chat.find({});
    console.log(`Total chats: ${allChats.length}`);

    // Create a map to track unique chat pairs
    const chatMap = new Map();
    const duplicates = [];

    for (const chat of allChats) {
      // Sort participants to create consistent key
      const participants = chat.participants
        .map((p) => p.toString())
        .sort()
        .join("_");

      if (chatMap.has(participants)) {
        // Duplicate found
        duplicates.push(chat._id);
        console.log(
          `Found duplicate: ${chat._id} for participants: ${participants}`,
        );
      } else {
        chatMap.set(participants, chat._id);
      }
    }

    if (duplicates.length === 0) {
      console.log("No duplicates found!");
    } else {
      console.log(`\nRemoving ${duplicates.length} duplicate chats...`);

      // Delete duplicates
      const result = await Chat.deleteMany({ _id: { $in: duplicates } });
      console.log(`Deleted ${result.deletedCount} duplicate chats`);
    }

    // Verify results
    const remainingChats = await Chat.find({});
    console.log(`\nRemaining chats: ${remainingChats.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Error cleaning up chats:", error);
    process.exit(1);
  }
}

cleanupDuplicateChats();
