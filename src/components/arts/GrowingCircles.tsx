"use client";

import { useEffect, useRef } from "react";

interface GrowingCirclesProps {
  size?: number;
}

export default function GrowingCircles({ size = 200 }: GrowingCirclesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    interface Circle {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      speed: number;
      opacity: number;
    }

    const circles: Circle[] = [];

    function addCircle() {
      circles.push({
        x: Math.random() * size,
        y: Math.random() * size,
        radius: 0,
        maxRadius: 15 + Math.random() * 25,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }

    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, size, size);

      if (Math.random() < 0.03) addCircle();

      for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i];
        c.radius += c.speed;

        if (c.radius > c.maxRadius) {
          circles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${c.opacity * (1 - c.radius / c.maxRadius)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      time += 0.016;
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
