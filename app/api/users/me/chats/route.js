import { NextResponse } from "next/server";
import Chat from "@/lib/db/Chat";
import User from "@/lib/db/User";
import Message from "@/lib/db/Message";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = user._id;

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("participants", "username email _id")
      .sort({ updatedAt: -1 });

    // Calculate unread count for each chat
    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          recipientId: userId,
          status: { $ne: "read" },
        });

        return {
          ...chat.toObject(),
          unreadCount,
        };
      })
    );

    return NextResponse.json(chatsWithUnreadCount, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
