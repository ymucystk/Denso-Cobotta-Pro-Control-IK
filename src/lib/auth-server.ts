// app/auth/auth-server.ts (サーバ専用ユーティリティ)
import { cookies } from "next/headers";
import * as jose from 'jose';
import {decryptJwt, verifyToken, verifyCognitoToken } from "./jwt_proc";
import { use } from "react";


export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roles?: string[];
} | null;



export async function getUserFromCookies(): Promise<AuthUser> {
  const token = cookies().get("worker_token")?.value;
  if (!token) return null;
  console.log("Getting user from cookies, token:", token);

  try {
    const payload = await verifyToken(token)
//    const payload = { sub: "u_123", name: "Alice", email: "a@example.com", roles: ["user"] };
    const userInfo = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
    };
    console.log("got:", userInfo);
    return (userInfo);
  } catch (error){
    console.error("Error decrypting JWT:", error);
    const payload = error.payload || {};
    const userInfo = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
    };
    return userInfo;
  }
}