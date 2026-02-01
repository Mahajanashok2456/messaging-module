const { trackLoginAttempt } = require("../lib/utils/loginAttempts");

describe("Login Attempt Tracking", () => {
  const testEmail = "test@example.com";

  beforeEach(() => {
    // Reset login attempts by calling with success
    trackLoginAttempt(testEmail, true);
  });

  describe("trackLoginAttempt", () => {
    test("should allow login on first attempt", () => {
      const result = trackLoginAttempt(testEmail, false);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(4);
    });

    test("should track multiple failed attempts", () => {
      trackLoginAttempt(testEmail, false); // 1st failure
      trackLoginAttempt(testEmail, false); // 2nd failure
      const result = trackLoginAttempt(testEmail, false); // 3rd failure
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(2);
    });

    test("should lockout after 5 failed attempts", () => {
      trackLoginAttempt(testEmail, false); // 1st
      trackLoginAttempt(testEmail, false); // 2nd
      trackLoginAttempt(testEmail, false); // 3rd
      trackLoginAttempt(testEmail, false); // 4th
      const fifthAttempt = trackLoginAttempt(testEmail, false); // 5th

      expect(fifthAttempt.allowed).toBe(false);
      expect(fifthAttempt.lockedUntil).toBeDefined();
      expect(fifthAttempt.message).toContain("locked");
    });

    test("should reset attempts on successful login", () => {
      trackLoginAttempt(testEmail, false); // Failed attempt
      trackLoginAttempt(testEmail, false); // Failed attempt
      const successResult = trackLoginAttempt(testEmail, true); // Success

      expect(successResult.allowed).toBe(true);
      expect(successResult.message).toBe("Login successful");

      // Next attempt should start fresh
      const nextResult = trackLoginAttempt(testEmail, false);
      expect(nextResult.remainingAttempts).toBe(4);
    });

    test("should prevent login during lockout period", () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        trackLoginAttempt(testEmail, false);
      }

      // Try to login during lockout
      const lockedResult = trackLoginAttempt(testEmail, false);
      expect(lockedResult.allowed).toBe(false);
      expect(lockedResult.message).toContain("locked");
    });

    test("should return proper message format", () => {
      const result = trackLoginAttempt(testEmail, false);
      expect(result).toHaveProperty("allowed");
      expect(result).toHaveProperty("message");
      expect(typeof result.message).toBe("string");
    });
  });
});
