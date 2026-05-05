"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function GameOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [generation, setGeneration] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<"alive" | "dead">("alive");
  const gridRef = useRef<boolean[][]>([]);
  const cellSize = 8;
  const colsRef = useRef(0);
  const rowsRef = useRef(0);

  const initGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    colsRef.current = cols;
    rowsRef.current = rows;

    const grid: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = Math.random() < 0.2;
      }
    }
    gridRef.current = grid;
    setGeneration(0);
  }, []);

  const clearGrid = useCallback(() => {
    const cols = colsRef.current;
    const rows = rowsRef.current;
    const grid: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = false;
      }
    }
    gridRef.current = grid;
    setGeneration(0);
  }, []);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const grid = gridRef.current;
    for (let y = 0; y < rowsRef.current; y++) {
      for (let x = 0; x < colsRef.current; x++) {
        if (grid[y][x]) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
  }, []);

  const step = useCallback(() => {
    const grid = gridRef.current;
    const cols = colsRef.current;
    const rows = rowsRef.current;
    const newGrid: boolean[][] = [];

    for (let y = 0; y < rows; y++) {
      newGrid[y] = [];
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            if (grid[ny][nx]) neighbors++;
          }
        }
        newGrid[y][x] = grid[y][x]
          ? neighbors === 2 || neighbors === 3
          : neighbors === 3;
      }
    }

    gridRef.current = newGrid;
    setGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initGrid();
      drawGrid();
    }

    resize();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, [initGrid, drawGrid]);

  useEffect(() => {
    drawGrid();
  }, [generation, drawGrid]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      step();
    }, speed);

    return () => clearInterval(interval);
  }, [running, speed, step]);

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { x, y } = cell;
    if (y >= 0 && y < rowsRef.current && x >= 0 && x < colsRef.current) {
      setDrawMode(gridRef.current[y][x] ? "dead" : "alive");
      gridRef.current[y][x] = !gridRef.current[y][x];
      setDrawing(true);
      drawGrid();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { x, y } = cell;
    if (y >= 0 && y < rowsRef.current && x >= 0 && x < colsRef.current) {
      gridRef.current[y][x] = drawMode === "alive";
      drawGrid();
    }
  };

  const handleMouseUp = () => {
    setDrawing(false);
  };

  return (
    <div className="h-screen bg-black flex flex-col pt-16">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-xs text-white/40">
          Generation: {generation}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Speed</span>
          <input
            type="range"
            min="10"
            max="500"
            value={510 - speed}
            onChange={(e) => setSpeed(510 - Number(e.target.value))}
            className="w-24 accent-white"
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 mx-4 mb-2 border border-white/10 rounded-lg overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          onClick={() => setRunning(!running)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            running
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {running ? "Pause" : "Play"}
        </button>
        <button
          onClick={() => {
            step();
            drawGrid();
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          Step
        </button>
        <button
          onClick={clearGrid}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          Clear
        </button>
        <button
          onClick={() => {
            initGrid();
            drawGrid();
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          Random
        </button>
      </div>
    </div>
  );
}
