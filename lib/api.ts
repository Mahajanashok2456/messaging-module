import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
};

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const csrfToken = getCookieValue("csrfToken");
      if (csrfToken) {
        config.headers["x-csrf-token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Optional: Redirect to login if needed, but usually handled by components
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
