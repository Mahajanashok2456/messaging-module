import { NextResponse } from "next/server";
import Message from "@/lib/db/Message";
import Chat from "@/lib/db/Chat";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = params;
    const currentUserId = user._id;

    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    // Validate that current user is part of the chat
    if (
      !chat.participants.some(
        (participant) => participant.toString() === currentUserId.toString(),
      )
    ) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Get messages for this chat
    const messages = await Message.find({
      $or: [
        { sender: chat.participants[0], recipient: chat.participants[1] },
        { sender: chat.participants[1], recipient: chat.participants[0] },
      ],
    })
      .populate("sender", "username")
      .populate("recipient", "username")
      .sort({ timestamp: 1 });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
