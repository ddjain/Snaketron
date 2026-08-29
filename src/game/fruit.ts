import { COLS, FRUIT_COUNT, MAX_FRUIT_SPAWN_RETRIES, ROWS } from "./constants.ts";
import { pointsEqual } from "./movement.ts";
import type { Fruit, Point } from "./types.ts";

export function cellKey(point: Point): string {
  return `${point.x},${point.y}`;
}

export function occupiedSet(snakes: Point[][], fruits: Fruit[]): Set<string> {
  const occupied = new Set<string>();
  for (const snake of snakes) {
    for (const segment of snake) {
      occupied.add(cellKey(segment));
    }
  }
  for (const fruit of fruits) {
    occupied.add(cellKey(fruit));
  }
  return occupied;
}

export function spawnFruit(
  occupied: Set<string>,
  random: () => number,
  nextId: () => string,
): Fruit | null {
  for (let attempt = 0; attempt < MAX_FRUIT_SPAWN_RETRIES; attempt++) {
    const x = Math.floor(random() * COLS);
    const y = Math.floor(random() * ROWS);
    if (!occupied.has(cellKey({ x, y }))) {
      const fruit = { id: nextId(), x, y };
      occupied.add(cellKey(fruit));
      return fruit;
    }
  }
  return null;
}

export function ensureFruitCount(
  snakes: Point[][],
  fruits: Fruit[],
  random: () => number,
  nextId: () => string,
): Fruit[] {
  const result = [...fruits];
  const occupied = occupiedSet(snakes, result);
  while (result.length < FRUIT_COUNT) {
    const spawned = spawnFruit(occupied, random, nextId);
    if (!spawned) {
      break;
    }
    result.push(spawned);
  }
  return result;
}

export function fruitAt(fruits: Fruit[], point: Point): Fruit | undefined {
  return fruits.find((fruit) => pointsEqual(fruit, point));
}
