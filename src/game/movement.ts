import { COLS, ROWS } from "./constants.ts";
import type { Direction, Point } from "./types.ts";

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function wrapPoint(point: Point): Point {
  return {
    x: ((point.x % COLS) + COLS) % COLS,
    y: ((point.y % ROWS) + ROWS) % ROWS,
  };
}

export function movePoint(point: Point, direction: Direction): Point {
  switch (direction) {
    case "UP":
      return { x: point.x, y: point.y - 1 };
    case "DOWN":
      return { x: point.x, y: point.y + 1 };
    case "LEFT":
      return { x: point.x - 1, y: point.y };
    case "RIGHT":
      return { x: point.x + 1, y: point.y };
  }
}

export function isOppositeDirection(a: Direction, b: Direction): boolean {
  return (
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT")
  );
}

export function calculateNextHead(head: Point, direction: Direction): Point {
  return wrapPoint(movePoint(head, direction));
}
