import { NextResponse } from "next/server";
import Message from "@/lib/db/Message";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const currentUserId = user._id;

    // Check if users are friends
    const isFriend = await User.exists({
      _id: currentUserId,
      friends: userId,
    });

    if (!isFriend) {
      return NextResponse.json(
        { message: "You can only view chat history with friends" },
        { status: 400 },
      );
    }

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    })
      .populate("sender", "username _id")
      .populate("recipient", "username _id")
      .sort({ timestamp: 1 });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
