import { NextResponse } from "next/server";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { rateLimit } from "@/lib/middleware/rateLimiter";
import {
  sanitizeInput,
  sanitizeEmail,
  validatePassword,
} from "@/lib/utils/sanitize";
import { generateTokenPair } from "@/lib/utils/jwt";
import AppError from "@/lib/utils/AppError";

export async function POST(req) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(3, 60 * 60 * 1000)(req);
    if (rateLimitResult) return rateLimitResult;

    await connectDB();

    let { username, email, password } = await req.json();

    // Sanitize inputs
    username = sanitizeInput(username);
    email = sanitizeEmail(email);

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "Please provide username, email and password" },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email or username already exists" },
        { status: 400 },
      );
    }

    // Create user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token pair
    const { accessToken, refreshToken } = generateTokenPair(
      user._id.toString(),
    );

    const response = NextResponse.json(
      {
        status: "success",
        data: {
          user: {
            _id: user._id,
            username: user.username,
            email: user.email,
          },
          accessToken,
        },
      },
      { status: 201 },
    );

    // Set refresh token as httpOnly cookie
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return response;
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { message: messages.join(", ") },
        { status: 400 },
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
