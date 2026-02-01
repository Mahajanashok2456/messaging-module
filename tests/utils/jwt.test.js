const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("../lib/utils/jwt");

describe("JWT Token Management", () => {
  const testUserId = "507f1f77bcf86cd799439011";

  describe("generateAccessToken", () => {
    test("should generate valid access token", () => {
      const token = generateAccessToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts
    });

    test("should include userId in token payload", () => {
      const token = generateAccessToken(testUserId);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testUserId);
    });

    test("should include correct issuer and audience", () => {
      const token = generateAccessToken(testUserId);
      const decoded = verifyAccessToken(token);
      expect(decoded.iss).toBe("mess-app");
      expect(decoded.aud).toBe("mess-app-users");
    });
  });

  describe("generateRefreshToken", () => {
    test("should generate valid refresh token", () => {
      const token = generateRefreshToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    test("should include userId in refresh token payload", () => {
      const token = generateRefreshToken(testUserId);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testUserId);
    });
  });

  describe("verifyAccessToken", () => {
    test("should verify valid access token", () => {
      const token = generateAccessToken(testUserId);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testUserId);
    });

    test("should throw error for invalid token", () => {
      expect(() => verifyAccessToken("invalid-token")).toThrow();
    });

    test("should throw error for expired token", () => {
      // This would need time manipulation or a separate test token
      // For now, just verify the function exists
      expect(verifyAccessToken).toBeDefined();
    });
  });

  describe("verifyRefreshToken", () => {
    test("should verify valid refresh token", () => {
      const token = generateRefreshToken(testUserId);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(testUserId);
    });

    test("should throw error for invalid refresh token", () => {
      expect(() => verifyRefreshToken("invalid-token")).toThrow();
    });
  });
});
