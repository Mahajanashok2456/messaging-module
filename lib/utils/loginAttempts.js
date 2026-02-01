const loginAttempts = new Map();
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function trackLoginAttempt(email, success) {
  const now = Date.now();
  const attempts = loginAttempts.get(email) || {
    count: 0,
    lockedUntil: null,
    firstAttempt: now,
  };

  // Check if account is locked
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return {
      allowed: false,
      lockedUntil: attempts.lockedUntil,
      message: `Account locked. Try again in ${Math.ceil((attempts.lockedUntil - now) / 60000)} minutes`,
    };
  }

  // Reset on success
  if (success) {
    loginAttempts.delete(email);
    return { allowed: true, message: "Login successful" };
  }

  // Increment failed attempts
  attempts.count++;

  // Lock account after MAX_ATTEMPTS
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_TIME;
    loginAttempts.set(email, attempts);
    return {
      allowed: false,
      lockedUntil: attempts.lockedUntil,
      message: `Account locked due to multiple failed attempts. Try again in 15 minutes`,
    };
  }

  loginAttempts.set(email, attempts);
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - attempts.count,
    message: `Invalid credentials. ${MAX_ATTEMPTS - attempts.count} attempts remaining`,
  };
}

// Cleanup old entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [email, data] of loginAttempts.entries()) {
      if (data.firstAttempt + LOCKOUT_TIME * 2 < now) {
        loginAttempts.delete(email);
      }
    }
  },
  30 * 60 * 1000,
); // Cleanup every 30 minutes
