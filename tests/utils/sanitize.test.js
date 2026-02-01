const {
  sanitizeInput,
  sanitizeEmail,
  validatePassword,
} = require("../lib/utils/sanitize");

describe("Input Sanitization", () => {
  describe("sanitizeInput", () => {
    test("should escape HTML special characters", () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );
    });

    test("should trim whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });

    test("should handle non-string input", () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
    });

    test("should escape quotes", () => {
      expect(sanitizeInput("It's a test")).toBe("It&#x27;s a test");
    });

    test("should escape ampersands", () => {
      expect(sanitizeInput("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });
  });

  describe("sanitizeEmail", () => {
    test("should validate and sanitize valid email", () => {
      expect(sanitizeEmail("test@example.com")).toBe("test@example.com");
    });

    test("should trim whitespace from email", () => {
      expect(sanitizeEmail("  test@example.com  ")).toBe("test@example.com");
    });

    test("should return null for invalid email", () => {
      expect(sanitizeEmail("invalid-email")).toBe(null);
      expect(sanitizeEmail("test@")).toBe(null);
      expect(sanitizeEmail("@example.com")).toBe(null);
    });

    test("should handle non-string input", () => {
      expect(sanitizeEmail(123)).toBe(123);
    });
  });

  describe("validatePassword", () => {
    test("should accept valid strong password", () => {
      expect(validatePassword("Strong@123")).toBe(true);
      expect(validatePassword("MyPass@2025")).toBe(true);
    });

    test("should accept password with various special characters", () => {
      expect(validatePassword("Test#1234")).toBe(true);
      expect(validatePassword("Pass$2025")).toBe(true);
      expect(validatePassword("Pwd%secure")).toBe(true);
      expect(validatePassword("MyP-word1")).toBe(true);
      expect(validatePassword("Secure_Pwd123")).toBe(true);
    });

    test("should reject password without uppercase", () => {
      expect(validatePassword("weak@123")).toBe(false);
    });

    test("should reject password without lowercase", () => {
      expect(validatePassword("WEAK@123")).toBe(false);
    });

    test("should reject password without number", () => {
      expect(validatePassword("Weak@Pass")).toBe(false);
    });

    test("should reject password without special character", () => {
      expect(validatePassword("Weak1234")).toBe(false);
    });

    test("should reject password less than 8 characters", () => {
      expect(validatePassword("Weak@1")).toBe(false);
    });
  });
});
