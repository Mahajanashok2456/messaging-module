import { NextResponse } from "next/server";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { verifyAuth } from "@/lib/middleware/authNext";

export async function GET(req) {
  try {
    await connectDB();

    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userDoc = await User.findById(user._id)
      .populate("friends", "username email _id")
      .select("friends");

    const friendsList = userDoc.friends || [];

    const transformedFriends = friendsList
      .map((friend) => {
        if (!friend) {
          return null;
        }

        return {
          id: friend._id.toString(),
          username: friend.username,
          email: friend.email,
        };
      })
      .filter((friend) => friend !== null);

    return NextResponse.json(transformedFriends, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error while fetching friends list" },
      { status: 500 },
    );
  }
}
