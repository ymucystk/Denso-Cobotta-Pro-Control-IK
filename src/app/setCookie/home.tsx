"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getCookie, setCookie, removeCookie , id_cookie} from "../../lib/cookie_id";

/**
 * Drop this file at: app/cookies/page.tsx (App Router)
 * or pages/cookies.tsx (Pages Router). Requires Next.js + React only.
 *
 * This page reads & writes three cookies:
 *  - cookieName (string)
 *  - vrModeAngle (float)
 *  - vrModeOffsetX (float)
 *
 * Notes
 * - Values are URL-encoded in cookies. Floats are stored as plain strings.
 * - Cookies are set with `path=/` and a 365-day expiration.
 */
export default function DyanmicHome() {
  // UI state (string for cookieName, numbers for the floats)
  const [cookieName, setCookieName] = useState("");
  const [vrModeAngle, setVrModeAngle] = useState<number | "">("");
  const [vrModeOffsetX, setVrModeOffsetX] = useState<number | "">("");

  const [message, setMessage] = useState<string>("");

  // Load existing cookie values on mount
  useEffect(() => {
    const cName = getCookie(id_cookie);
    const angleStr = getCookie("vrModeAngle");
    const offsetStr = getCookie("vrModeOffsetX");

    setCookieName(cName ?? "");
    setVrModeAngle(angleStr !== undefined && angleStr !== "" ? Number(angleStr) : "");
    setVrModeOffsetX(
      offsetStr !== undefined && offsetStr !== "" ? Number(offsetStr) : ""
    );
  }, []);

  const saveAll = () => {
    try {
      setCookie(id_cookie, cookieName ?? "");
      setCookie("vrModeAngle", String(vrModeAngle ?? ""));
      setCookie("vrModeOffsetX", String(vrModeOffsetX ?? ""));
      setMessage("保存しました (Saved cookies)");
      setTimeout(() => setMessage(""), 2500);
    } catch (e) {
      setMessage("保存に失敗しました (Failed to save)");
      console.error(e);
    }
  };

  const reloadFromCookies = () => {
    const cName = getCookie(id_cookie);
    const angleStr = getCookie("vrModeAngle");
    const offsetStr = getCookie("vrModeOffsetX");

    setCookieName(cName ?? "");
    setVrModeAngle(angleStr !== undefined && angleStr !== "" ? Number(angleStr) : "");
    setVrModeOffsetX(
      offsetStr !== undefined && offsetStr !== "" ? Number(offsetStr) : ""
    );
    setMessage("Cookie から再読込しました");
    setTimeout(() => setMessage(""), 2000);
  };

  const clearAll = () => {
    removeCookie("cookieName");
    removeCookie("vrModeAngle");
    removeCookie("vrModeOffsetX");
    setMessage("削除しました (Cleared)");
    setCookieName("");
    setVrModeAngle("");
    setVrModeOffsetX("");
    setTimeout(() => setMessage(""), 2000);
  };

  // Basic input validators to keep floats clean
  const handleFloat = (
    setter: React.Dispatch<React.SetStateAction<number | "">>,
    v: string
  ) => {
    if (v.trim() === "") return setter("");
    const n = Number(v);
    if (Number.isNaN(n)) return; // ignore invalid chars
    setter(n);
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8 md:max-w-5xl lg:max-w-7xl">
        <h1 className="text-2xl font-bold mb-6">
          メタワーク実験 管理用 Cookie 設定</h1>

        {message && (
          <div className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 w-full">
          {/* cookieName */}
          <div className="w-full rounded-2xl border bg-white p-3 shadow-sm">
            <p className="mt-2 text-xs text-gray-500">各端末やブラウザがユニークにわかるIDを入力</p>
            <label className="block text-sm font-medium mb-2" htmlFor="cookieName">
              id_cookie (string)
            </label>
            <input
              id="cookieName"
              type="text"
              value={cookieName}
              onChange={(e) => setCookieName(e.target.value)}
              className="w-full max-w-2xl  border px-3 py-2 focus:outline-none focus:ring"
              style={{width: "100%",  maxWidth: "400px"}}
              placeholder="例: user-123"
            />
          </div>

          {/* vrModeAngle */}
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="mt-2 text-xs text-gray-500">初期状態のアームの回転入力</p>
            <label className="block text-sm font-medium mb-2" htmlFor="vrModeAngle">
              vrModeAngle (float)
            </label>
            <input
              id="vrModeAngle"
              type="number"
              step="any"
              inputMode="decimal"
              value={vrModeAngle === "" ? "" : String(vrModeAngle)}
              onChange={(e) => handleFloat(setVrModeAngle, e.target.value)}
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
              placeholder="例: 45.0"
            />
          </div>

          {/* vrModeOffsetX */}
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <p className="mt-2 text-xs text-gray-500">初期状態のアームのXオフセット入力</p>
            <label className="block text-sm font-medium mb-2" htmlFor="vrModeOffsetX">
              vrModeOffsetX (float)
            </label>
            <input
              id="vrModeOffsetX"
              type="number"
              step="any"
              inputMode="decimal"
              value={vrModeOffsetX === "" ? "" : String(vrModeOffsetX)}
              onChange={(e) => handleFloat(setVrModeOffsetX, e.target.value)}
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
              placeholder="例: 0.25"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={saveAll}
            className="rounded-2xl bg-black px-4 py-2 text-white shadow-sm hover:opacity-90"
            aria-label="Save cookies"
          >
            保存 (Save)
          </button>

          <button
            onClick={reloadFromCookies}
            className="rounded-2xl border px-4 py-2 shadow-sm hover:bg-gray-100"
            aria-label="Reload from cookies"
          >
            再読込 (Reload)
          </button>

          <button
            onClick={clearAll}
            className="rounded-2xl border px-4 py-2 shadow-sm hover:bg-gray-100"
            aria-label="Clear cookies"
          >
            クリア (Clear)
          </button>
        </div>

        <section className="mt-10 text-sm text-gray-600">
          <h2 className="font-semibold mb-2">デバッグ表示</h2>
          <ul className="list-disc pl-6">
            <li>
              id_cookie: <code className="ml-1">{JSON.stringify(cookieName)}</code>
            </li>
            <li>
              vrModeAngle: <code className="ml-1">{JSON.stringify(vrModeAngle)}</code>
            </li>
            <li>
              vrModeOffsetX: <code className="ml-1">{JSON.stringify(vrModeOffsetX)}</code>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
