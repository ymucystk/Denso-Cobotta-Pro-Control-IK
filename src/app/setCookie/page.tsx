"use client";
import dynamic from 'next/dynamic';

const DynamicHome = dynamic(() => import('./home'), { ssr: false });

export default function Home() {
  return (
    <DynamicHome />
  );
}
