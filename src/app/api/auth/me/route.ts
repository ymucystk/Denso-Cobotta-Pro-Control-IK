// app/api/auth/me/route.ts

// runs on server side

import { NextResponse } from "next/server";
import { getUserFromCookies, getKominkanUserFromCookies } from "../../../../lib/auth-server";

export async function GET() {
  const user = await getUserFromCookies();
  const kuser = await getKominkanUserFromCookies();
  const kid = kuser?.kid ?? "no-kid";
  if (user){
    user.kid = kid;
  }
  console.log("ME!:",user)
  return NextResponse.json({ ...user }); // { user: null } もあり得る
}
