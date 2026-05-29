import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  await signOut(req, response);
  return response;
}
