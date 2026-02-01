const jwt = require("jsonwebtoken");
const User = require("../db/User");

const parseCookies = (cookieHeader = "") => {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const auth = async (req, res, next) => {
  try {
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");
    const cookies = parseCookies(req.headers.cookie || "");
    const cookieToken = cookies.accessToken;
    const token = cookieToken || headerToken;

    if (!token) {
      return res
        .status(401)
        .json({ message: "No authentication token, access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "mess-app",
      audience: "mess-app-users",
    });
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Token invalid, access denied" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalid, access denied" });
  }
};

module.exports = auth;
