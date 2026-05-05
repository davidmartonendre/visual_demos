"use client";

import { useEffect, useRef } from "react";
import { noise2D } from "@/lib/noise";

interface FlowFieldProps {
  size?: number;
}

export default function FlowField({ size = 200 }: FlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    const spacing = 12;

    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, size, size);

      for (let x = 0; x < size; x += spacing) {
        for (let y = 0; y < size; y += spacing) {
          const angle =
            noise2D(x * 0.02 + time * 0.3, y * 0.02 + time * 0.3) * Math.PI * 2;
          const length = 8;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(
            x + Math.cos(angle) * length,
            y + Math.sin(angle) * length
          );
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      time += 0.01;
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
