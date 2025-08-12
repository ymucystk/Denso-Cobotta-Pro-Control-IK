"use client";
import dynamic from 'next/dynamic';
import { AppMode } from '../appmode.js';
import AuthGate from "../../lib/AuthGate";

// 動的インポートを使用して、SSRを無効化
const DynamicHome = dynamic(() => import('../home.js'), { ssr: false });


export default function Home() {
  return (
    <AuthGate>
      <DynamicHome appmode={AppMode.practice} />
    </AuthGate>
  );
}
