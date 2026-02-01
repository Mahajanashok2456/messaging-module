import { NextResponse } from "next/server";
import Message from "@/lib/db/Message";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function PUT(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { messageIds } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { message: "messageIds array is required" },
        { status: 400 },
      );
    }

    // Mark all messages as read
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        recipient: user._id,
        status: { $ne: "read" },
      },
      {
        $set: {
          status: "read",
          readAt: new Date(),
        },
      },
    );

    return NextResponse.json(
      {
        message: "Messages marked as read",
        modifiedCount: result.modifiedCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
