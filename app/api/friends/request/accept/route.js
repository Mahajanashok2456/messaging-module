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
    const userId = user._id;

    const userDoc = await User.findById(userId);

    // Find the request by ObjectId
    const requestIndex = userDoc.friendRequests.findIndex(
      (request) => request._id.toString() === requestId,
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
    });

    await User.findByIdAndUpdate(requesterId, {
      $addToSet: { friends: userId },
    });

    // Remove the request
    userDoc.friendRequests.splice(requestIndex, 1);
    await userDoc.save();

    const requester = await User.findById(requesterId);
    const sentRequestIndex = requester.sentRequests.findIndex(
      (req) => req.to.toString() === userId.toString(),
    );

    if (sentRequestIndex !== -1) {
      requester.sentRequests.splice(sentRequestIndex, 1);
      await requester.save();
    }

    return NextResponse.json(
      { message: "Friend request accepted" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
