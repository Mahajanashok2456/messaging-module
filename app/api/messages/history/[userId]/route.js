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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200,
    );
    const before = searchParams.get("before");
    const after = searchParams.get("after");

    const timeFilter = {};
    if (before) timeFilter.$lt = new Date(before);
    if (after) timeFilter.$gt = new Date(after);

    // Get messages between the two users
    const messageQuery = {
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    };

    if (before || after) {
      messageQuery.timestamp = timeFilter;
    }

    const messages = await Message.find(messageQuery)
      .populate("sender", "username _id")
      .populate("recipient", "username _id")
      .sort({ timestamp: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const sliced = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore
      ? sliced[sliced.length - 1]?.timestamp?.toISOString()
      : null;

    return NextResponse.json(
      {
        messages: sliced.reverse(),
        hasMore,
        nextCursor,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
