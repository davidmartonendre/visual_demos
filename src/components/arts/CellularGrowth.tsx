"use client";

import { useEffect, useRef } from "react";
import { noise2D } from "@/lib/noise";

interface CellularGrowthProps {
  size?: number;
}

export default function CellularGrowth({ size = 200 }: CellularGrowthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    const cellSize = 8;
    const cols = Math.ceil(size / cellSize);
    const rows = Math.ceil(size / cellSize);

    interface Cell {
      alive: boolean;
      age: number;
      opacity: number;
    }

    const grid: Cell[][] = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = {
          alive: Math.random() < 0.15,
          age: 0,
          opacity: Math.random(),
        };
      }
    }

    function countNeighbors(x: number, y: number): number {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + cols) % cols;
          const ny = (y + dy + rows) % rows;
          if (grid[ny][nx].alive) count++;
        }
      }
      return count;
    }

    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, size, size);

      const newGrid: Cell[][] = [];
      for (let y = 0; y < rows; y++) {
        newGrid[y] = [];
        for (let x = 0; x < cols; x++) {
          const cell = grid[y][x];
          const neighbors = countNeighbors(x, y);
          let alive = cell.alive;

          if (cell.alive) {
            alive = neighbors === 2 || neighbors === 3;
          } else {
            alive = neighbors === 3;
          }

          const noiseVal = noise2D(x * 0.1 + time * 0.2, y * 0.1 + time * 0.2);
          if (Math.random() < 0.01 && noiseVal > 0.3) {
            alive = true;
          }

          newGrid[y][x] = {
            alive,
            age: alive ? cell.age + 1 : 0,
            opacity: alive ? Math.min(1, cell.age * 0.1 + 0.2) : 0,
          };
        }
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = newGrid[y][x];
          if (cell.alive) {
            const noiseVal = noise2D(x * 0.2 + time, y * 0.2 + time);
            const r = Math.max(0.5, cellSize * 0.4 + noiseVal * 2);
            ctx.beginPath();
            ctx.arc(
              x * cellSize + cellSize / 2,
              y * cellSize + cellSize / 2,
              r,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${cell.opacity * 0.8})`;
            ctx.fill();
          }
        }
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          grid[y][x] = newGrid[y][x];
        }
      }

      time += 0.05;
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
