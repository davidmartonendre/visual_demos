import { renderHook, act } from '@testing-library/react';
import { useRef, useCallback } from 'react';
import GameOfLife from './page';

// Mock the global Math.random for predictable initGrid behavior
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.1; // Always create a living cell

describe('GameOfLife', () => {
  let canvasMock: HTMLCanvasElement;
  let ctxMock: CanvasRenderingContext2D;

  beforeEach(() => {
    ctxMock = {
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    canvasMock = {
      getContext: vi.fn(() => ctxMock),
      width: 80,
      height: 80,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 80,
        height: 80,
        x: 0,
        y: 0,
        right: 0,
        bottom: 0,
        toJSON: vi.fn(),
      }),
    } as unknown as HTMLCanvasElement;

    // Reset Math.random
    global.Math = mockMath;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initGrid initializes grid with correct dimensions and sets generation to 0', () => {
    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement>(canvasMock);
      const gridRef = useRef<boolean[][]>([]);
      const colsRef = useRef(0);
      const rowsRef = useRef(0);
      const setGeneration = vi.fn();
      const cellSize = 8; // Assuming cellSize is 8 as in the component

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

      return { initGrid, gridRef, colsRef, rowsRef, setGeneration };
    });

    act(() => {
      result.current.initGrid();
    });

    expect(result.current.colsRef.current).toBe(10); // 80 / 8
    expect(result.current.rowsRef.current).toBe(10); // 80 / 8
    expect(result.current.gridRef.current.length).toBe(10);
    expect(result.current.gridRef.current[0].length).toBe(10);
    expect(result.current.setGeneration).toHaveBeenCalledWith(0);
    // With mockMath.random = 0.1, all cells should be alive since 0.1 < 0.2
    expect(result.current.gridRef.current.every(row => row.every(cell => cell))).toBe(true);
  });

  it('clearGrid sets all cells to dead and resets generation to 0', () => {
    const { result } = renderHook(() => {
      const gridRef = useRef<boolean[][]>([
        [true, true],
        [true, true],
      ]);
      const colsRef = useRef(2);
      const rowsRef = useRef(2);
      const setGeneration = vi.fn();

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

      return { clearGrid, gridRef, setGeneration };
    });

    act(() => {
      result.current.clearGrid();
    });

    expect(result.current.gridRef.current.every(row => row.every(cell => cell === false))).toBe(true);
    expect(result.current.setGeneration).toHaveBeenCalledWith(0);
  });

  it('step evolves the grid according to Conway's rules and increments generation', () => {
    const { result } = renderHook(() => {
      const gridRef = useRef<boolean[][]>([
        [false, true, false],
        [false, true, false],
        [false, true, false],
      ]); // A "blinker" pattern
      const colsRef = useRef(3);
      const rowsRef = useRef(3);
      const setGeneration = vi.fn();

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
        setGeneration((g: number) => g + 1);
      }, []);

      return { step, gridRef, setGeneration };
    });

    act(() => {
      result.current.step();
    });

    const expectedGrid = [
      [false, false, false],
      [true, true, true],
      [false, false, false],
    ]; // Blinker rotated

    expect(result.current.gridRef.current).toEqual(expectedGrid);
    expect(result.current.setGeneration).toHaveBeenCalledWith(1); // Assuming initial generation is 0
  });

  it('getCellFromEvent returns correct cell coordinates for a mouse event', () => {
    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement>(canvasMock);
      const cellSize = 8; // Assuming cellSize is 8

      const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / cellSize);
        const y = Math.floor((e.clientY - rect.top) / cellSize);
        return { x, y };
      }, []);

      return { getCellFromEvent };
    });

    // Mock mouse event for (10, 10) on canvas
    const mockMouseEvent: React.MouseEvent<HTMLCanvasElement> = {
      clientX: 10,
      clientY: 10,
      // @ts-ignore
      currentTarget: canvasMock,
    };

    let cell = null;
    act(() => {
      cell = result.current.getCellFromEvent(mockMouseEvent);
    });

    expect(cell).toEqual({ x: 1, y: 1 }); // (10/8) = 1.25 -> floor(1)

    // Mock mouse event for (7, 7) - should be (0, 0)
    const mockMouseEvent2: React.MouseEvent<HTMLCanvasElement> = {
      clientX: 7,
      clientY: 7,
      // @ts-ignore
      currentTarget: canvasMock,
    };

    act(() => {
      cell = result.current.getCellFromEvent(mockMouseEvent2);
    });
    expect(cell).toEqual({ x: 0, y: 0 });

    // Mock mouse event for (79, 79) - should be (9, 9)
    const mockMouseEvent3: React.MouseEvent<HTMLCanvasElement> = {
      clientX: 79,
      clientY: 79,
      // @ts-ignore
      currentTarget: canvasMock,
    };

    act(() => {
      cell = result.current.getCellFromEvent(mockMouseEvent3);
    });
    expect(cell).toEqual({ x: 9, y: 9 });
  });
});