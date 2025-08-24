"use client";
import React, { useEffect, useRef } from "react";
import "./error.css"; // ← グローバルCSSとして読み込み

function ParticleBG() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let rafId = 0;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; ao: number };
    let particles: P[] = [];

    const parent = canvas.parentElement as HTMLElement;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      // 物理解像度
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      // CSSピクセル上の見た目サイズ
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // スケールを毎回リセットしてから適用
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const init = (count = 90) => {
      const rect = parent.getBoundingClientRect();
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 0.8 + Math.random() * 2.0,
        a: Math.random() * Math.PI * 2,
        ao: 0.006 + Math.random() * 0.01,
      }));
    };

    const step = () => {
      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const linkDist = 100;

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        // ラップ（画面外に出たら反対側へ）
        if (p.x < -20) p.x = rect.width + 20;
        if (p.x > rect.width + 20) p.x = -20;
        if (p.y < -20) p.y = rect.height + 20;
        if (p.y > rect.height + 20) p.y = -20;

        // ゆるい点滅
        p.a += p.ao;
        const twinkle = 0.5 + 0.5 * Math.sin(p.a);

        // 白背景でも見える濃いめの青
        ctx.beginPath();
        ctx.fillStyle = `rgba(30, 60, 150, ${0.28 + 0.32 * twinkle})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 近い粒子同士を細い線で接続
      ctx.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            ctx.strokeStyle = `rgba(30, 60, 150, ${(1 - d / linkDist) * 0.35})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(step);
    };

    const onResize = () => {
      resize();
      // 画面サイズが大きく変わったら位置を再初期化（好みで）
      init(particles.length || 90);
    };

    // 初期化（レイアウト適用後に実行）
    resize();
    init(90);
    rafId = requestAnimationFrame(step);

    const ro = new ResizeObserver(onResize);
    ro.observe(parent);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particleCanvas" aria-hidden="true" />;
}

export default function ErrorPage() {
  return (
    <div className="wrapper">
      <ParticleBG />
      <div className="card">
        <h2 className="title">メタワーク 実証実験システム</h2>
        <p className="message">
          認証エラーが発生しました。以下のボタンから
          <br />
          <strong>PINコード</strong>を再入力してください。
        </p>
        <p className="note">エラーを繰り返す場合は、スタッフにお知らせください。</p>
        <a href="https://metawork.euca.in/demo/user" className="button">
          PINコードの再入力
        </a>
      </div>
    </div>
  );
}
