import { NextResponse } from "next/server";
import Message from "@/lib/db/Message";
import Chat from "@/lib/db/Chat";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function POST(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { recipientId, recipient_id, content } = await req.json();
    const senderId = user._id;
    const targetRecipientId = recipientId || recipient_id;

    if (!targetRecipientId || !content) {
      return NextResponse.json(
        { message: "recipientId and content are required" },
        { status: 400 },
      );
    }

    // Check if recipient exists
    const recipient = await User.findById(targetRecipientId);
    if (!recipient) {
      return NextResponse.json(
        { message: "Recipient not found" },
        { status: 404 },
      );
    }

    // Check if users are friends
    const isFriend = await User.exists({
      _id: senderId,
      friends: targetRecipientId,
    });

    if (!isFriend) {
      return NextResponse.json(
        { message: "You can only message friends" },
        { status: 400 },
      );
    }

    // Create and save message
    const message = new Message({
      sender: senderId,
      recipient: targetRecipientId,
      content,
    });

    await message.save();

    // Populate sender and recipient info
    await message.populate("sender", "username");
    await message.populate("recipient", "username");

    // Update the chat's last message
    try {
      const chat = await Chat.findOrCreateBetweenUsers(
        senderId,
        targetRecipientId,
      );
      chat.lastMessage = content.substring(0, 50);
      chat.lastMessageTimestamp = new Date();
      chat.updatedAt = new Date();
      await chat.save();
    } catch (chatError) {
      console.error("Error updating chat last message:", chatError.message);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
