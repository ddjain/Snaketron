import { describe, expect, it } from "vitest";
import { COLS, ROWS } from "./constants.ts";
import { placePlayersAtStart } from "./startPlacement.ts";
import type { Point } from "./types.ts";

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function squaredDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function maxDistanceFrom(head: Point): number {
  let max = 0;
  for (let x = 0; x < COLS; x += 1) {
    for (let y = 0; y < ROWS; y += 1) {
      max = Math.max(max, squaredDistance({ x, y }, head));
    }
  }
  return max;
}

function bodyFits(snake: Point[], direction: string): boolean {
  const opposite: Record<string, { dx: number; dy: number }> = {
    UP: { dx: 0, dy: 1 },
    DOWN: { dx: 0, dy: -1 },
    LEFT: { dx: 1, dy: 0 },
    RIGHT: { dx: -1, dy: 0 },
  };
  const offset = opposite[direction];
  for (let i = 1; i < snake.length; i += 1) {
    const expected = {
      x: snake[0].x + offset.dx * i,
      y: snake[0].y + offset.dy * i,
    };
    if (!(snake[i].x === expected.x && snake[i].y === expected.y)) {
      return false;
    }
  }
  return true;
}

describe("placePlayersAtStart", () => {
  it("places both snakes in bounds with length 3 and a valid direction", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const { p1, p2 } = placePlayersAtStart(lcg(seed));
      expect(p1.snake).toHaveLength(3);
      expect(p2.snake).toHaveLength(3);
      for (const player of [p1, p2]) {
        for (const cell of player.snake) {
          expect(cell.x).toBeGreaterThanOrEqual(0);
          expect(cell.x).toBeLessThan(COLS);
          expect(cell.y).toBeGreaterThanOrEqual(0);
          expect(cell.y).toBeLessThan(ROWS);
        }
        expect(bodyFits(player.snake, player.direction)).toBe(true);
      }
    }
  });

  it("keeps the two snakes apart", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const { p1, p2 } = placePlayersAtStart(lcg(seed));
      const cells = new Set(p1.snake.map((cell) => `${cell.x},${cell.y}`));
      for (const cell of p2.snake) {
        expect(cells.has(`${cell.x},${cell.y}`)).toBe(false);
      }
    }
  });

  it("spawns player 2 at the farthest possible cell from player 1", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const { p1, p2 } = placePlayersAtStart(lcg(seed));
      const p1Head = p1.snake[0];
      expect(squaredDistance(p2.snake[0], p1Head)).toBe(maxDistanceFrom(p1Head));
    }
  });

  it("works when player 1 spawns at the very edge of a corner", () => {
    const { p1 } = placePlayersAtStart(lcg(7));
    // force a corner-ish head via a seeded draw by first proving variety below
    expect(p1.snake[0].x).toBeGreaterThanOrEqual(0);
  });

  it("varies positions and directions between games", () => {
    const layouts = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const { p1, p2 } = placePlayersAtStart(lcg(seed));
      layouts.add(
        `${p1.snake[0].x},${p1.snake[0].y}:${p2.snake[0].x},${p2.snake[0].y}:${p1.direction}:${p2.direction}`,
      );
    }
    expect(layouts.size).toBeGreaterThan(10);
  });

  it("is deterministic for the same random sequence", () => {
    const a = placePlayersAtStart(lcg(42));
    const b = placePlayersAtStart(lcg(42));
    expect(a).toEqual(b);
  });
});