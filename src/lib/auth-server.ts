// app/auth/auth-server.ts (サーバ専用ユーティリティ)
// runs on server side..

import { cookies } from "next/headers";
import { verifyToken, verifyCognitoToken } from "./jwt_proc";
import type { AuthUser } from "types/user";

export async function getUserFromCookies(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get("worker_token")?.value;
  if (!token) return null;
//  console.log("Getting user from cookies, token:", token);

  const kominkan = await getKominkanUserFromCookies()

  if (token === "__worker-token__"){ // only for _no_auth
    const userInfo = {
      id: "test_worker_id",
      kid: "test_kominkan_id",
      name: "test name",
      email: "test@test.com",
      roles: ["none"],
    }
    console.log("got:", userInfo);
     return (userInfo);
  }

  try {
    const payload = await verifyToken(token)
    const userInfo = {
      id: payload.sub,
      kid: kominkan?.kid,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
    };
//    console.log("got:", userInfo);
    return (userInfo);
  } catch (error){
    console.error("Error decrypting JWT:", error);
    const payload = error.payload || {};
    const userInfo = {
      id: payload.sub,
      kid: kominkan?.kid,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
    };
    return userInfo;
  }
}

export async function getKominkanUserFromCookies(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get("kominkan_token")?.value;
  if (!token) {
    console.log("No kominkan token")
    return null;
  }

  console.log("token:", token);
  if (token === "__kominkan-token__"){ // only for _no_auth
    const userInfo = {
      id: "none",
      kid: "test_kominkan_id",
      name: "test name",
      email: "test@test.com",
      roles: ["none"],
    }
    console.log("got kominkan:", userInfo);
     return (userInfo);
  }


  console.log("Getting user from cookies, kominken token:", token);

  try {
    const payload = await verifyCognitoToken(token)
//    console.log("Kominkan payload", payload)
    const userInfo = {
      id: null,
      kid: payload.sub,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
    };
    console.log("got Kominkan:", userInfo);
    return (userInfo);
  } catch (error){
    console.error("Error decrypting JWT:", error);
    const payload = error.payload || {};
    const userInfo = {
      id: null,
      kid: payload.sub,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
    };
    return userInfo;
  }
}
