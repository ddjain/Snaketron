import { MIN_SNAKE_LENGTH, MAX_TAIL_CONSUME } from "./constants.ts";
import { pointsEqual } from "./movement.ts";
import type { PlayerState, Point } from "./types.ts";

export function snakeTail(snake: Point[]): Point {
  return snake[snake.length - 1];
}

/** Body cells occupied after this tick's tail drop (excludes tail if it will move). */
export function effectiveBody(player: PlayerState): Point[] {
  if (player.growthPending > 0 || player.snake.length <= 1) {
    return player.snake;
  }
  return player.snake.slice(0, -1);
}

export function detectHeadCollision(
  p1Next: Point,
  p2Next: Point,
  p1Head: Point,
  p2Head: Point,
): boolean {
  if (pointsEqual(p1Next, p2Next)) {
    return true;
  }
  return pointsEqual(p1Next, p2Head) && pointsEqual(p2Next, p1Head);
}

export function detectTailAttack(nextHead: Point, opponent: PlayerState): boolean {
  return pointsEqual(nextHead, snakeTail(opponent.snake));
}

export function tailSegmentsToConsume(opponent: PlayerState): number {
  return Math.min(MAX_TAIL_CONSUME, Math.max(0, opponent.snake.length - MIN_SNAKE_LENGTH));
}

export function detectOpponentBodyCollision(
  nextHead: Point,
  opponent: PlayerState,
): boolean {
  const bodyWithoutTail = opponent.snake.slice(0, -1);
  return bodyWithoutTail.some((segment) => pointsEqual(segment, nextHead));
}

export function detectSelfCollision(nextHead: Point, player: PlayerState): boolean {
  return effectiveBody(player).some((segment) => pointsEqual(segment, nextHead));
}
