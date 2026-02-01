import { NextResponse } from "next/server";
import { generateCsrfToken, setCsrfCookie } from "@/lib/utils/csrf";

export async function GET() {
  const response = NextResponse.json({ status: "success" }, { status: 200 });
  const token = generateCsrfToken();
  setCsrfCookie(response, token);
  return response;
}
