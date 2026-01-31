import { NextResponse } from "next/server";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";
import { sendFriendRequestNotification } from "../../notifications/notificationService";

export async function POST(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { recipientId } = await req.json();
    const senderId = user._id;

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if trying to add self
    if (senderId.toString() === recipientId) {
      return NextResponse.json(
        { message: "You cannot add yourself as a friend" },
        { status: 400 },
      );
    }

    // Check if already friends
    const isAlreadyFriend = await User.exists({
      _id: senderId,
      friends: recipientId,
    });

    if (isAlreadyFriend) {
      return NextResponse.json(
        { message: "You are already friends with this user" },
        { status: 400 },
      );
    }

    // Check if request already sent
    const existingRequest = recipient.friendRequests.find(
      (request) => request.from.toString() === senderId.toString(),
    );

    if (existingRequest) {
      return NextResponse.json(
        { message: "Friend request already sent" },
        { status: 400 },
      );
    }

    // Add request to recipient
    await User.findByIdAndUpdate(recipientId, {
      $addToSet: {
        friendRequests: { from: senderId },
      },
    });

    // Add to sender's sent requests
    await User.findByIdAndUpdate(senderId, {
      $addToSet: {
        sentRequests: { to: recipientId },
      },
    });

    // Send notification
    await sendFriendRequestNotification(recipientId, {
      _id: senderId,
      username: user.username,
    });

    return NextResponse.json(
      { message: "Friend request sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
