import { NextResponse } from "next/server";
import Chat from "@/lib/db/Chat";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function POST(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { recipientId, otherUserId } = await req.json();
    const senderId = user._id;
    const targetUserId = recipientId || otherUserId;

    if (!targetUserId) {
      return NextResponse.json(
        { message: "recipientId or otherUserId is required" },
        { status: 400 },
      );
    }

    const chat = await Chat.findOrCreateBetweenUsers(senderId, targetUserId);

    return NextResponse.json(
      {
        chatId: chat._id,
        participants: chat.participants,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
