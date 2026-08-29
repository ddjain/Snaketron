import { COLS, ROWS } from "./constants.ts";
import { movePoint } from "./movement.ts";
import type { Direction, Point } from "./types.ts";

export type PlacedPlayer = {
  snake: Point[];
  direction: Direction;
};

const DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

function inBounds(point: Point): boolean {
  return point.x >= 0 && point.x < COLS && point.y >= 0 && point.y < ROWS;
}

function squeezeDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function farthestCell(from: Point): Point {
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: ROWS - 1 },
    { x: COLS - 1, y: 0 },
    { x: COLS - 1, y: ROWS - 1 },
  ];
  let best = corners[0];
  let bestDistance = squeezeDistance(best, from);
  for (const corner of corners) {
    const distance = squeezeDistance(corner, from);
    if (distance > bestDistance) {
      best = corner;
      bestDistance = distance;
    }
  }
  return best;
}

function buildPlayer(head: Point, random: () => number): PlacedPlayer {
  const snake = [head];
  const valid = DIRECTIONS.filter((direction) => {
    const tail1 = movePoint(head, OPPOSITE[direction]);
    const tail2 = movePoint(tail1, OPPOSITE[direction]);
    return inBounds(tail1) && inBounds(tail2);
  });
  const direction = valid[Math.floor(random() * valid.length)];
  if (!direction) {
    throw new Error("no valid start direction for head");
  }
  const tail1 = movePoint(head, OPPOSITE[direction]);
  const tail2 = movePoint(tail1, OPPOSITE[direction]);
  snake.push(tail1, tail2);
  return { snake, direction };
}

function overlap(a: Point[], b: Point[]): boolean {
  const cells = new Set(a.map((point) => `${point.x},${point.y}`));
  return b.some((point) => cells.has(`${point.x},${point.y}`));
}

export function placePlayersAtStart(random: () => number): {
  p1: PlacedPlayer;
  p2: PlacedPlayer;
} {
  const p1Head = {
    x: Math.floor(random() * COLS),
    y: Math.floor(random() * ROWS),
  };
  const p1 = buildPlayer(p1Head, random);

  const p2Head = farthestCell(p1Head);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const p2 = buildPlayer(p2Head, random);
    if (!overlap(p1.snake, p2.snake)) {
      return { p1, p2 };
    }
  }
  return { p1, p2: buildPlayer(p2Head, random) };
}