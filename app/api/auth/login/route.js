import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "24h",
    issuer: "mess-app",
    audience: "mess-app-users",
  });
};

export async function POST(req) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Please provide email and password" },
        { status: 400 },
      );
    }

    // Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Generate token
    const token = generateToken(user._id);

    return NextResponse.json(
      {
        status: "success",
        data: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
          },
          token,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
