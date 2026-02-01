const request = require("supertest");
const { createTestApp } = require("../helpers/testServer");
const {
  connectTestDb,
  disconnectTestDb,
  clearDatabase,
} = require("../helpers/mongo");

let app;

describe("Rate limiting", () => {
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

  test("register rate limit triggers", async () => {
    let lastResponse;

    for (let i = 0; i < 4; i += 1) {
      lastResponse = await request(app)
        .post("/api/auth/register")
        .send({
          username: `user${i}`,
          email: `user${i}@example.com`,
          password: "Password@123",
        });
    }

    expect(lastResponse.status).toBe(429);
  });
});
