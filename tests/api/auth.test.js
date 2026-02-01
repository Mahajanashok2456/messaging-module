const request = require("supertest");
const { createTestApp } = require("../helpers/testServer");
const {
  connectTestDb,
  disconnectTestDb,
  clearDatabase,
} = require("../helpers/mongo");
const User = require("../../lib/db/User");
const { extractCookies } = require("../helpers/cookies");

let app;

describe("Auth API", () => {
  beforeAll(async () => {
    app = await createTestApp();
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  test("register sets auth and csrf cookies", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "alice",
      email: "alice@example.com",
      password: "Password@123",
    });

    expect(response.status).toBe(201);
    const cookies = extractCookies(response.headers["set-cookie"] || []);
    expect(cookies.accessToken).toBeDefined();
    expect(cookies.refreshToken).toBeDefined();
    expect(cookies.csrfToken).toBeDefined();
  });

  test("login sets auth and csrf cookies", async () => {
    const user = new User({
      username: "bob",
      email: "bob@example.com",
      password: "Password@123",
    });
    await user.save();

    const response = await request(app).post("/api/auth/login").send({
      email: "bob@example.com",
      password: "Password@123",
    });

    expect(response.status).toBe(200);
    const cookies = extractCookies(response.headers["set-cookie"] || []);
    expect(cookies.accessToken).toBeDefined();
    expect(cookies.refreshToken).toBeDefined();
    expect(cookies.csrfToken).toBeDefined();
  });
});
