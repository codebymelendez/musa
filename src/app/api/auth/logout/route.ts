import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  await signOut(response);
  return response;
}
