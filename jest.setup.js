// Jest setup file
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  "test-jwt-secret-key-for-testing-purposes-only-32chars";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-key-for-testing-only-32chars";
process.env.ENCRYPTION_KEY = "test-encryption-key-for-testing-purposes-32chars";
process.env.MONGODB_URI = "mongodb://localhost:27017/messaging_app_test";
