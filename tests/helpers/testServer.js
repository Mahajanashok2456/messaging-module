const express = require("express");

const buildNextRequest = (req, url) => {
  const headers = new Headers();
  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (typeof value === "string") {
      headers.set(key, value);
    }
  });

  const init = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(req.body || {});
  }

  return new Request(url, init);
};

const handleRoute = (handler, urlBuilder) => async (req, res) => {
  const url = urlBuilder(req);
  const nextReq = buildNextRequest(req, url);
  const response = await handler(nextReq, { params: req.params });

  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.text();
  res.send(body);
};

const createTestApp = async () => {
  const [
    authLogin,
    authRegister,
    authProfile,
    authCsrf,
    messagesSend,
    messagesMarkRead,
    messagesHistory,
  ] = await Promise.all([
    import("../../app/api/auth/login/route.js"),
    import("../../app/api/auth/register/route.js"),
    import("../../app/api/auth/profile/route.js"),
    import("../../app/api/auth/csrf/route.js"),
    import("../../app/api/messages/send/route.js"),
    import("../../app/api/messages/mark-read/route.js"),
    import("../../app/api/messages/history/[userId]/route.js"),
  ]);

  const { POST: loginPost } = authLogin;
  const { POST: registerPost } = authRegister;
  const { GET: profileGet } = authProfile;
  const { GET: csrfGet } = authCsrf;
  const { POST: sendPost } = messagesSend;
  const { PUT: markReadPut } = messagesMarkRead;
  const { GET: historyGet } = messagesHistory;

  const app = express();
  app.use(express.json());

  app.post(
    "/api/auth/login",
    handleRoute(loginPost, () => "http://localhost/api/auth/login"),
  );
  app.post(
    "/api/auth/register",
    handleRoute(registerPost, () => "http://localhost/api/auth/register"),
  );
  app.get(
    "/api/auth/profile",
    handleRoute(profileGet, () => "http://localhost/api/auth/profile"),
  );
  app.get(
    "/api/auth/csrf",
    handleRoute(csrfGet, () => "http://localhost/api/auth/csrf"),
  );

  app.post(
    "/api/messages/send",
    handleRoute(sendPost, () => "http://localhost/api/messages/send"),
  );
  app.put(
    "/api/messages/mark-read",
    handleRoute(markReadPut, () => "http://localhost/api/messages/mark-read"),
  );
  app.get(
    "/api/messages/history/:userId",
    handleRoute(
      historyGet,
      (req) => `http://localhost/api/messages/history/${req.params.userId}`,
    ),
  );

  return app;
};

module.exports = { createTestApp };
