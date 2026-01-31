import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/lib/db/User";
import { connectDB } from "@/lib/db/db";
import AppError from "@/lib/utils/AppError";

// Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>"'&]/g, "");
};

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

    let { username, email, password } = await req.json();

    // Sanitize inputs
    username = sanitizeInput(username);
    email = sanitizeInput(email);

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "Please provide username, email and password" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    // Additional validation for password strength
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Check password complexity
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          message:
            "Password must contain uppercase, lowercase, number, and special character",
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
      { status: 201 },
    );
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { message: messages.join(", ") },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
