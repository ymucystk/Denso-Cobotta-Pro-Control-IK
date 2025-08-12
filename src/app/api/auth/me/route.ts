// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getUserFromCookies } from "../../../../lib/auth-server";

export async function GET() {
  const user = await getUserFromCookies();
  return NextResponse.json({ user }); // { user: null } もあり得る
}
