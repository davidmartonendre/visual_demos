"use client";

import { useEffect, useRef } from "react";
import { noise2D } from "@/lib/noise";

interface OrganicWavesProps {
  size?: number;
}

export default function OrganicWaves({ size = 200 }: OrganicWavesProps) {
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

      const numWaves = 8;
      for (let w = 0; w < numWaves; w++) {
        ctx.beginPath();
        const yBase = (size / (numWaves + 1)) * (w + 1);

        for (let x = 0; x <= size; x += 2) {
          const noiseVal = noise2D(x * 0.02 + w * 0.5, time * 0.5 + w * 0.3);
          const y = yBase + noiseVal * 20 + Math.sin(x * 0.05 + time + w) * 5;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + (w / numWaves) * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
