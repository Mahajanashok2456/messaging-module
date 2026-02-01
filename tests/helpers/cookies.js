const extractCookies = (setCookie = []) => {
  const cookies = {};
  setCookie.forEach((cookie) => {
    const [pair] = cookie.split(";");
    const [name, value] = pair.split("=");
    cookies[name] = value;
  });
  return cookies;
};

const buildCookieHeader = (cookies) => {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
};

module.exports = {
  extractCookies,
  buildCookieHeader,
};
