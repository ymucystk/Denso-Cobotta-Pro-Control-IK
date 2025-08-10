"use client";
import dynamic from 'next/dynamic';
import { AppMode } from '../appmode.js';

const DynamicHome = dynamic(() => import('./home.tsx'), { ssr: false });

export default function Home() {
  return (
    <DynamicHome />
  );
}
