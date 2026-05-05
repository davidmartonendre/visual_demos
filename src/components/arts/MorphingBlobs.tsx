"use client";

import { useEffect, useRef } from "react";
import { noise2D } from "@/lib/noise";

interface MorphingBlobsProps {
  size?: number;
}

export default function MorphingBlobs({ size = 200 }: MorphingBlobsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);

      const numBlobs = 5;
      for (let i = 0; i < numBlobs; i++) {
        ctx.beginPath();
        const cx = size / 2 + Math.sin(time * 0.3 + i * 1.2) * 30;
        const cy = size / 2 + Math.cos(time * 0.4 + i * 0.8) * 30;
        const baseRadius = 25 + Math.sin(time * 0.5 + i) * 10;

        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
          const noiseVal = noise2D(
            Math.cos(angle) * 2 + time * 0.2 + i,
            Math.sin(angle) * 2 + time * 0.2 + i
          );
          const r = baseRadius + noiseVal * 20;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (i % 3) * 0.05})`;
        ctx.fill();
      }

      time += 0.02;
      animationId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}
