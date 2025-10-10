// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("worker_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // 即時失効
  });
  return res;
}


export async function GET() {
  const res = NextResponse.json({ ok: true , status: "logout"});
  res.cookies.set("worker_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // 即時失効
  });
  res.cookies.set("kominkan_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // 即時失効
  });


  return res;
}

