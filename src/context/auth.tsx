"use client";
import { createContext, ReactNode, useEffect, useState } from 'react';
import { User } from "@/types/user";

// コンテクスト用の型を定義
type UserContextType = User | null | undefined;

// コンテクストを作成
const AuthContext = createContext<UserContextType>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 配布したいデータの定義
  const [user, setUser] = useState<UserContextType>();

  useEffect(() => {
    // ユーザー情報を取得する関数
  }, []);

  // プロバイダーを作成し、配布物を格納する
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
