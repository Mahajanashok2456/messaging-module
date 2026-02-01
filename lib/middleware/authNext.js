import jwt from "jsonwebtoken";
import User from "@/lib/db/User";

export async function verifyAuth(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.replace("Bearer ", "");
    const cookieToken = req.cookies?.get("accessToken")?.value;
    const token = cookieToken || headerToken;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "mess-app",
      audience: "mess-app-users",
    });
    const user = await User.findById(decoded.userId).select("-password");

    return user;
  } catch (error) {
    return null;
  }
}

export function withAuth(handler) {
  return async (req) => {
    const user = await verifyAuth(req);

    if (!user) {
      return new Response(
        JSON.stringify({ message: "Token invalid, access denied" }),
        { status: 401 },
      );
    }

    // Attach user to request
    req.user = user;
    return handler(req);
  };
}
