"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("auth/profile");
        const user = response.data?.data?.user;
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          router.push("/chat");
          return;
        }
        router.push("/login");
      } catch (error) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <p className="text-lg text-gray-600">Loading...</p>
    </div>
  );
}
