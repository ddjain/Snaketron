import {
  FRUIT_SCORE,
  P1_START,
  P2_START,
  TAIL_SEGMENT_SCORE,
} from "./constants.ts";
import {
  detectHeadCollision,
  detectOpponentBodyCollision,
  detectSelfCollision,
  detectTailAttack,
  tailSegmentsToConsume,
} from "./collision.ts";
import { ensureFruitCount, fruitAt } from "./fruit.ts";
import { calculateNextHead, isOppositeDirection } from "./movement.ts";
import type {
  Direction,
  Fruit,
  GameConfig,
  GameResult,
  GameState,
  GameStatus,
  PlayerId,
  PlayerState,
  Point,
} from "./types.ts";

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    snake: player.snake.map(clonePoint),
  };
}

function cloneFruits(fruits: Fruit[]): Fruit[] {
  return fruits.map((fruit) => ({ ...fruit }));
}

function defaultPlayer(
  id: PlayerId,
  start: { snake: Point[]; direction: Direction },
): PlayerState {
  return {
    id,
    direction: start.direction,
    nextDirection: start.direction,
    snake: start.snake.map(clonePoint),
    alive: true,
    score: 0,
    growthPending: 0,
  };
}

function mergePlayer(base: PlayerState, partial?: Partial<PlayerState>): PlayerState {
  if (!partial) {
    return clonePlayer(base);
  }
  return {
    ...base,
    ...partial,
    id: base.id,
    snake: (partial.snake ?? base.snake).map(clonePoint),
  };
}

export class GameEngine {
  private state: GameState;
  private readonly random: () => number;
  private fruitSeq = 1;
  private readonly fruitId: () => string;

  constructor(config: GameConfig = {}) {
    this.random = config.random ?? Math.random;
    this.fruitId =
      config.fruitId ??
      (() => {
        const id = `f${this.fruitSeq}`;
        this.fruitSeq += 1;
        return id;
      });

    const p1 = mergePlayer(defaultPlayer("p1", P1_START), config.initialState?.players?.p1);
    const p2 = mergePlayer(defaultPlayer("p2", P2_START), config.initialState?.players?.p2);

    const providedFruits = config.initialState?.fruits;
    const fruits = providedFruits
      ? cloneFruits(providedFruits)
      : ensureFruitCount([p1.snake, p2.snake], [], this.random, this.fruitId);

    this.state = {
      tick: config.initialState?.tick ?? 0,
      status: config.initialState?.status ?? "WAITING",
      players: { p1, p2 },
      fruits,
      result: config.initialState?.result ?? null,
    };
  }

  setInput(playerId: PlayerId, direction: Direction): void {
    const player = this.state.players[playerId];
    if (!player.alive || this.state.status === "FINISHED") {
      return;
    }
    if (isOppositeDirection(player.direction, direction)) {
      return;
    }
    player.nextDirection = direction;
  }

  setStatus(status: GameStatus): void {
    this.state.status = status;
  }

  tick(): void {
    if (this.state.status !== "PLAYING") {
      return;
    }

    const p1 = clonePlayer(this.state.players.p1);
    const p2 = clonePlayer(this.state.players.p2);

    p1.direction = p1.nextDirection;
    p2.direction = p2.nextDirection;

    const p1Next = p1.alive ? calculateNextHead(p1.snake[0], p1.direction) : p1.snake[0];
    const p2Next = p2.alive ? calculateNextHead(p2.snake[0], p2.direction) : p2.snake[0];

    let p1Dead = !p1.alive;
    let p2Dead = !p2.alive;
    let p1TailEat = 0;
    let p2TailEat = 0;

    if (p1.alive && p2.alive && detectHeadCollision(p1Next, p2Next, p1.snake[0], p2.snake[0])) {
      p1Dead = true;
      p2Dead = true;
    }

    if (!p1Dead && !p2Dead) {
      // Simultaneous tail attacks against start-of-tick tails. If both heads
      // occupy the same cell it was already a head-to-head and both are dead.
      if (p1.alive && detectTailAttack(p1Next, p2)) {
        p1TailEat = tailSegmentsToConsume(p2);
      }
      if (p2.alive && detectTailAttack(p2Next, p1)) {
        p2TailEat = tailSegmentsToConsume(p1);
      }

      if (p1.alive && p1TailEat === 0 && detectOpponentBodyCollision(p1Next, p2)) {
        p1Dead = true;
      }
      if (p2.alive && p2TailEat === 0 && detectOpponentBodyCollision(p2Next, p1)) {
        p2Dead = true;
      }

      if (!p1Dead && detectSelfCollision(p1Next, p1)) {
        p1Dead = true;
      }
      if (!p2Dead && detectSelfCollision(p2Next, p2)) {
        p2Dead = true;
      }
    }

    const moved1 = this.movePlayer(p1, p1Next, p1Dead);
    const moved2 = this.movePlayer(p2, p2Next, p2Dead);

    let fruits = cloneFruits(this.state.fruits);
    let p1Fruit = 0;
    let p2Fruit = 0;

    if (!p1Dead) {
      const eaten = fruitAt(fruits, moved1.snake[0]);
      if (eaten) {
        p1Fruit = 1;
        fruits = fruits.filter((fruit) => fruit.id !== eaten.id);
      }
    }
    if (!p2Dead) {
      const eaten = fruitAt(fruits, moved2.snake[0]);
      if (eaten) {
        p2Fruit = 1;
        fruits = fruits.filter((fruit) => fruit.id !== eaten.id);
      }
    }

    this.applyGrowthAndTail(moved1, p1Fruit, p1Dead ? 0 : p1TailEat, p2Dead ? 0 : p2TailEat);
    this.applyGrowthAndTail(moved2, p2Fruit, p2Dead ? 0 : p2TailEat, p1Dead ? 0 : p1TailEat);

    moved1.alive = !p1Dead;
    moved2.alive = !p2Dead;
    moved1.score += p1Fruit * FRUIT_SCORE + (p1Dead ? 0 : p1TailEat) * TAIL_SEGMENT_SCORE;
    moved2.score += p2Fruit * FRUIT_SCORE + (p2Dead ? 0 : p2TailEat) * TAIL_SEGMENT_SCORE;

    fruits = ensureFruitCount(
      [moved1.snake, moved2.snake],
      fruits,
      this.random,
      this.fruitId,
    );

    let result: GameResult | null = null;
    let status: GameStatus = "PLAYING";
    if (p1Dead && p2Dead) {
      result = "draw";
      status = "FINISHED";
    } else if (p1Dead) {
      result = "p2_wins";
      status = "FINISHED";
    } else if (p2Dead) {
      result = "p1_wins";
      status = "FINISHED";
    }

    this.state = {
      tick: this.state.tick + 1,
      status,
      players: { p1: moved1, p2: moved2 },
      fruits,
      result,
    };
  }

  getState(): GameState {
    return {
      tick: this.state.tick,
      status: this.state.status,
      result: this.state.result,
      fruits: cloneFruits(this.state.fruits),
      players: {
        p1: clonePlayer(this.state.players.p1),
        p2: clonePlayer(this.state.players.p2),
      },
    };
  }

  isFinished(): boolean {
    return this.state.status === "FINISHED";
  }

  getResult(): GameResult | null {
    return this.state.result;
  }

  reset(): void {
    const p1 = defaultPlayer("p1", P1_START);
    const p2 = defaultPlayer("p2", P2_START);
    this.state = {
      tick: 0,
      status: "WAITING",
      result: null,
      players: { p1, p2 },
      fruits: ensureFruitCount([p1.snake, p2.snake], [], this.random, this.fruitId),
    };
  }

  private movePlayer(player: PlayerState, nextHead: Point, dead: boolean): PlayerState {
    if (dead) {
      return {
        ...player,
        snake: [clonePoint(nextHead), ...player.snake.map(clonePoint)],
        growthPending: player.growthPending,
      };
    }
    return {
      ...player,
      snake: [clonePoint(nextHead), ...player.snake.map(clonePoint)],
    };
  }

  /**
   * After adding a head, length is old+1. Target length is old + fruit + tailEat,
   * then victim extra pops of tailLost.
   */
  private applyGrowthAndTail(
    player: PlayerState,
    fruitGrow: number,
    tailEat: number,
    tailLost: number,
  ): void {
    const oldLen = player.snake.length - 1;
    const growth = player.growthPending + fruitGrow + tailEat;
    player.growthPending = 0;
    let target = oldLen + growth - tailLost;
    if (target < 1) {
      target = 1;
    }
    while (player.snake.length > target) {
      player.snake.pop();
    }
    while (player.snake.length < target) {
      const tail = player.snake[player.snake.length - 1];
      player.snake.push(clonePoint(tail));
    }
  }
}

export function createTestGame(config: GameConfig = {}): GameEngine {
  return new GameEngine(config);
}
