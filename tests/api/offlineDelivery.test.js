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

describe("Offline delivery defaults", () => {
  let sender;
  let recipient;
  let senderCookies;

  beforeAll(async () => {
    app = await createTestApp();
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDatabase();

    sender = new User({
      username: "sender",
      email: "sender@example.com",
      password: "Password@123",
    });
    recipient = new User({
      username: "recipient",
      email: "recipient@example.com",
      password: "Password@123",
    });

    await sender.save();
    await recipient.save();

    sender.friends.push(recipient._id);
    recipient.friends.push(sender._id);
    await sender.save();
    await recipient.save();

    const login = await request(app).post("/api/auth/login").send({
      email: "sender@example.com",
      password: "Password@123",
    });
    senderCookies = extractCookies(login.headers["set-cookie"] || []);
  });

  test("message persists with status sent before delivery", async () => {
    const messageId = "offline-msg-1";

    const response = await request(app)
      .post("/api/messages/send")
      .set("Cookie", buildCookieHeader(senderCookies))
      .set("x-csrf-token", senderCookies.csrfToken)
      .send({
        recipientId: recipient._id.toString(),
        content: "Offline message",
        messageId,
      });

    expect(response.status).toBe(201);

    const stored = await Message.findOne({ messageId });
    expect(stored.status).toBe("sent");
    expect(stored.deliveryAttempts).toBe(0);
  });
});
