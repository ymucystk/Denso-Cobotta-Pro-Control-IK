// /components/AuthGate.tsx
"use client";
import React, { PropsWithChildren, useEffect } from "react";
import { useAuth } from "../context/auth";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGate({ children }: PropsWithChildren) {
  const user = useAuth();
  const router = useRouter();
  const pathname = usePathname();

    console.log('AuthGate user:', user);

  useEffect(() => {
    if (user === null) {
      // 未ログイン → /login へ
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
    }
  }, [user, router, pathname]);

  if (user === undefined) {
    // 取得中
    return (
      <div className="p-6 text-center">
        <span className="animate-pulse">Checking session…</span>
      </div>
    );
  }

  if (user === null) {
    // リダイレクト中は何も描画しない
    return null;
  }

  // ログイン済み
  return <>{children}</>;
}
// このコンポーネントは、ユーザーがログインしているかどうかを確認し、
// ログインしていない場合はログインページにリダイレクトします。
// ログイン状態が不明な場合は、ローディング状態を表示します。
