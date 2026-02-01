export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  // Trim whitespace
  let sanitized = input.trim();

  // Remove potentially dangerous HTML characters
  sanitized = sanitized.replace(/[<>"'&]/g, (char) => {
    const escapeMap = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "&": "&amp;",
    };
    return escapeMap[char];
  });

  return sanitized;
};

export const sanitizeEmail = (email) => {
  const sanitized = sanitizeInput(email);
  // Additional email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
  return regex.test(password);
};
