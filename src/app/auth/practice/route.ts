import { NextResponse } from "next/server";
import * as jose from 'jose';

// GET リクエストハンドラ
export async function GET(req) {
  const token = req.nextUrl.searchParams.get('token');
  const redirect_uri = 'https://localhost:3000/error';
  console.log('token:', token);

  if (!token) {
    return NextResponse.redirect(redirect_uri+"?error=missing!!token");
  }
  console.log('token:', token);

  const decryptToken = await decryptJwt(token);

  console.log('decryptToken:', decryptToken);

  if (!decryptToken) {
    return NextResponse.redirect(redirect_uri+"?err=decryptError");
  }

  const { metawork_token, virtual_kominkan_token } = decryptToken;

  const jwtPayload = await verifyToken(metawork_token);
  console.log('jwtPayload:', jwtPayload);
  if (!jwtPayload) {
    return NextResponse.redirect(redirect_uri+"?err=Payload");
  }

  const response = NextResponse.redirect('https://localhost:3000/practice');
  response.cookies.set('worker_access_token', metawork_token, { httpOnly: true, path: '/' });
  return response;
  
  //return NextResponse.redirect('https://localhost:3000/error/?token='+token);
}

// トークン復号関数
const decryptJwt = async (text) => {
  const SSO_JOSE_SECRET = process.env.SSO_JOSE_SECRET;
  console.log('SSO_JOSE_SECRET:', SSO_JOSE_SECRET);
  if (!SSO_JOSE_SECRET) {
    return null;
  }

  const secret = jose.base64url.decode(SSO_JOSE_SECRET);
  console.log('secret:', secret);
  const { payload } = await jose.jwtDecrypt(text, secret);
  return payload;
}

// JWT 検証関数
const verifyToken = async (token) => {
  try {
    const SSO_KEYCLOAK_URL = process.env.SSO_KEYCLOAK_URL;
    const SSO_KEYCLOAK_REALM = process.env.SSO_KEYCLOAK_REALM;
    if (!token || !SSO_KEYCLOAK_URL || !SSO_KEYCLOAK_REALM) {
      return null;
    }

    const JWKS_URL = `${SSO_KEYCLOAK_URL}/realms/${SSO_KEYCLOAK_REALM}/protocol/openid-connect/certs`;
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jose.jwtVerify(token, JWKS);

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
