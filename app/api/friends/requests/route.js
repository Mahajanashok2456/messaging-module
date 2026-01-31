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
      .populate("friendRequests.from", "username email")
      .select("friendRequests");

    const requests = userDoc.friendRequests || [];

    const transformedRequests = requests
      .map((request) => {
        if (!request.from) {
          return null;
        }

        return {
          id: request._id.toString(),
          from: request.from._id.toString(),
          username: request.from.username,
          email: request.from.email,
          createdAt: request.createdAt,
        };
      })
      .filter((request) => request !== null);

    return NextResponse.json(transformedRequests, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
