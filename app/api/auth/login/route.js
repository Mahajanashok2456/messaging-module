import { NextResponse } from "next/server";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import { rateLimit } from "@/lib/middleware/rateLimiter";
import { trackLoginAttempt } from "@/lib/utils/loginAttempts";
import { generateTokenPair } from "@/lib/utils/jwt";
import { sanitizeEmail } from "@/lib/utils/sanitize";

export async function POST(req) {
  try {
    // Apply rate limiting (increased limit for login: 20 attempts per 15 minutes)
    const rateLimitResult = await rateLimit(20, 15 * 60 * 1000)(req);
    if (rateLimitResult) return rateLimitResult;

    await connectDB();

    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Please provide email and password" },
        { status: 400 },
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    // Find user
    const user = await User.findOne({ email: sanitizedEmail }).select(
      "+password",
    );

    // Track login attempt
    if (!user || !(await user.comparePassword(password))) {
      const attemptResult = trackLoginAttempt(sanitizedEmail, false);
      if (!attemptResult.allowed) {
        return NextResponse.json(
          { message: attemptResult.message },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { message: attemptResult.message },
        { status: 401 },
      );
    }

    // Successful login
    trackLoginAttempt(sanitizedEmail, true);

    // Generate token pair
    const { accessToken, refreshToken } = generateTokenPair(
      user._id.toString(),
    );

    // Set refresh token as httpOnly cookie
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
      { status: 200 },
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
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
