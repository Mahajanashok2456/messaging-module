import { NextResponse } from "next/server";
import Message from "@/lib/db/Message";
import Chat from "@/lib/db/Chat";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";
import { rateLimit } from "@/lib/middleware/rateLimiter";
import { sanitizeInput } from "@/lib/utils/sanitize";

export async function POST(req) {
  try {
    // Apply rate limiting (50 messages per 15 minutes)
    const rateLimitResult = await rateLimit(50, 15 * 60 * 1000)(req);
    if (rateLimitResult) return rateLimitResult;

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

    // Sanitize message content
    const sanitizedContent = sanitizeInput(content);
    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return NextResponse.json(
        { message: "Message content cannot be empty" },
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
      content: sanitizedContent,
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
      chat.lastMessage = sanitizedContent.substring(0, 50);
      chat.lastMessageTimestamp = new Date();
      chat.updatedAt = new Date();
      await chat.save();
    } catch (chatError) {
      console.error("Error updating chat last message:", chatError.message);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
