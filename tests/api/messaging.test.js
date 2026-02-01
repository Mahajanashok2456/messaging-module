const request = require("supertest");
const { createTestApp } = require("../helpers/testServer");
const {
  connectTestDb,
  disconnectTestDb,
  clearDatabase,
} = require("../helpers/mongo");
const { extractCookies, buildCookieHeader } = require("../helpers/cookies");
const User = require("../../lib/db/User");
const Message = require("../../lib/db/Message");

let app;

describe("Messaging API", () => {
  let userA;
  let userB;
  let cookiesA;
  let cookiesB;

  beforeAll(async () => {
    app = await createTestApp();
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();

    userA = new User({
      username: "alice",
      email: "alice@example.com",
      password: "Password@123",
    });
    userB = new User({
      username: "bob",
      email: "bob@example.com",
      password: "Password@123",
    });

    await userA.save();
    await userB.save();

    userA.friends.push(userB._id);
    userB.friends.push(userA._id);
    await userA.save();
    await userB.save();

    const loginA = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "Password@123",
    });
    cookiesA = extractCookies(loginA.headers["set-cookie"] || []);

    const loginB = await request(app).post("/api/auth/login").send({
      email: "bob@example.com",
      password: "Password@123",
    });
    cookiesB = extractCookies(loginB.headers["set-cookie"] || []);
  });

  test("send message is idempotent by messageId", async () => {
    const messageId = "msg-123";

    const sendResponse = await request(app)
      .post("/api/messages/send")
      .set("Cookie", buildCookieHeader(cookiesA))
      .set("x-csrf-token", cookiesA.csrfToken)
      .send({
        recipientId: userB._id.toString(),
        content: "Hello",
        messageId,
      });

    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body.messageId).toBe(messageId);

    const repeatResponse = await request(app)
      .post("/api/messages/send")
      .set("Cookie", buildCookieHeader(cookiesA))
      .set("x-csrf-token", cookiesA.csrfToken)
      .send({
        recipientId: userB._id.toString(),
        content: "Hello",
        messageId,
      });

    expect(repeatResponse.status).toBe(201);
    expect(repeatResponse.body._id).toBe(sendResponse.body._id);
    const count = await Message.countDocuments({ messageId });
    expect(count).toBe(1);
  });

  test("mark-read updates message status", async () => {
    const message = new Message({
      sender: userA._id,
      recipient: userB._id,
      content: "Read me",
      messageId: "msg-read-1",
    });
    await message.save();

    const response = await request(app)
      .put("/api/messages/mark-read")
      .set("Cookie", buildCookieHeader(cookiesB))
      .set("x-csrf-token", cookiesB.csrfToken)
      .send({ messageIds: [message._id.toString()] });

    expect(response.status).toBe(200);
    const updated = await Message.findById(message._id);
    expect(updated.status).toBe("read");
    expect(updated.readAt).toBeTruthy();
  });
});
