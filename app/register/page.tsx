"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { MessageCircle, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("auth/register", {
        username,
        email,
        password,
      });

      // API returns: { status: "success", data: { user: {...}, accessToken: "..." } }
      const { data } = response.data;
      const accessToken = data?.accessToken;

      if (accessToken) {
        localStorage.setItem("token", accessToken);
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        router.push("/chat");
      } else {
        setError("Registration failed: No token received");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#128C7E] via-[#075E54] to-[#25D366] px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-md space-y-6 md:space-y-8 relative z-10 px-4">
        {/* Logo & Header */}
        <div className="text-center">
          <div className="mx-auto h-16 md:h-20 w-16 md:w-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-4 md:mb-6">
            <MessageCircle className="h-10 md:h-12 w-10 md:w-12 text-[#25D366]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Get Started
          </h2>
          <p className="text-white/80 text-xs md:text-sm">
            Create your account to start messaging
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                  <User className="h-4 md:h-5 w-4 md:w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="block w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 text-sm md:text-base text-gray-900 border-2 border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 transition-all"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email-address"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 md:h-5 w-4 md:w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 text-sm md:text-base text-gray-900 border-2 border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 transition-all"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs md:text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 md:h-5 w-4 md:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3.5 text-sm md:text-base text-gray-900 border-2 border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 transition-all"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 md:h-5 w-4 md:w-5" />
                  ) : (
                    <Eye className="h-4 md:h-5 w-4 md:w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 md:p-4 rounded-lg">
                <p className="text-red-700 text-xs md:text-sm font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-semibold py-2.5 md:py-3.5 text-sm md:text-base rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#25D366] hover:text-[#128C7E] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-white/60 text-xs">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
}
