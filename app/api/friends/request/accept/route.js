import { NextResponse } from "next/server";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function PUT(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json(
        { message: "requestId is required" },
        { status: 400 },
      );
    }

    const userId = user._id;

    const userDoc = await User.findById(userId);

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find the request by its _id in the friendRequests array
    const requestIndex = userDoc.friendRequests.findIndex(
      (request) => request._id.toString() === requestId.toString(),
    );

    if (requestIndex === -1) {
      return NextResponse.json(
        { message: "Friend request not found" },
        { status: 404 },
      );
    }

    const requesterId = userDoc.friendRequests[requestIndex].from;

    // Add each other as friends
    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: requesterId },
      $pull: { friendRequests: { _id: requestId } },
    });

    await User.findByIdAndUpdate(requesterId, {
      $addToSet: { friends: userId },
      $pull: { sentRequests: { to: userId } },
    });

    return NextResponse.json(
      { message: "Friend request accepted" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Accept friend request error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
