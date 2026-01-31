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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { message: "Query parameter is required" },
        { status: 400 },
      );
    }

    const currentUser = await User.findById(user._id)
      .populate("friends", "_id")
      .populate("sentRequests.to", "_id")
      .populate("friendRequests.from", "_id");

    const friends = currentUser.friends || [];
    const sentRequests = currentUser.sentRequests || [];
    const friendRequests = currentUser.friendRequests || [];

    const friendIds = friends.map((friend) => friend._id.toString());
    const sentRequestIds = sentRequests
      .map((req) => {
        if (req && req.to) {
          return req.to._id ? req.to._id.toString() : req.to.toString();
        }
        return "";
      })
      .filter((id) => id);

    const receivedRequestIds = friendRequests
      .map((req) => {
        if (req && req.from) {
          return req.from._id ? req.from._id.toString() : req.from.toString();
        }
        return "";
      })
      .filter((id) => id);

    const excludeIds = [
      user._id.toString(),
      ...friendIds,
      ...sentRequestIds,
      ...receivedRequestIds,
    ].filter((id) => id);

    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
        {
          _id: { $nin: excludeIds },
        },
      ],
    })
      .select("_id username email profilePicture isOnline")
      .limit(20);

    const transformedUsers = users.map((userObj) => ({
      id: userObj._id.toString(),
      name: userObj.username,
      username: userObj.username,
      email: userObj.email,
      avatar: userObj.profilePicture,
      online: userObj.isOnline,
      lastMessage: "",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      unread: 0,
    }));

    return NextResponse.json(transformedUsers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
