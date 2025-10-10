import { NextResponse } from "next/server";

export const runtime = "nodejs"; // EdgeでもOKだがfetchオプションの自由度優先でnodejs

// 環境変数から API URL を取得
const TARGET = process.env.ENEBULAR_ENDPOINT;
const ORIGIN = process.env.ALLOW_ORIGIN;
const ENEBULAR_LOG_AUTH = process.env.ENEBULAR_LOG_AUTH;

//console.log("log proxy TARGET",TARGET)

// 短期間に同じログを書き込むのを避ける手法

let lastLog = "";
let lastLogTime = -1;

const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};


// Preflight
export async function OPTIONS(req:Request) {
  console.log("Preflight! get!",req)
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST only（Enebular API を中継）
export async function POST(req: Request) {
  //  console.log("POST proxy request", req.url);
  try {
    const bodyText = await req.text(); // 透過
    const headers = await req.headers;
//    console.log("POST logproxy", Object.fromEntries(headers.entries()), bodyText);
    console.log("POST logProxy", bodyText);
    const now = new Date();

    if (bodyText === lastLog && (now.getTime() - lastLogTime ) < 10000){ // 10秒以内で同じデータなら
      console.log("Too short span logText!")
      return new NextResponse(JSON.stringify({result:"OK"}), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    lastLog = bodyText;
    lastLogTime = now.getTime();
    const upstream = await fetch(TARGET, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENEBULAR_LOG_AUTH}`
      },
      body: bodyText && bodyText.trim().length ? bodyText : "{}"
    });

    const text = await upstream.text();

    console.log("Get logEnebular Status:", upstream.status, "text:" ,text)

    return new NextResponse(text, {
      status: upstream.status,
      headers: { ...CORS, "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" }

    });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ error: e?.message ?? "proxy failed" }), {
      status: 502,
      headers: { ...CORS, "Content-Type": "application/json" }
    });

  }
}

// 任意：GET 等に403返す（誤使用防止）
export async function GET() {
  return new NextResponse(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}

