import { describe, expect, it } from "vitest";
import { COLS, MIN_SNAKE_LENGTH, ROWS, P1_START, P2_START } from "./constants.ts";
import { createTestGame } from "./gameEngine.ts";
import { calculateNextHead, isOppositeDirection, wrapPoint } from "./movement.ts";
import type { Direction, Fruit, PlayerState, Point } from "./types.ts";

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const SAFE_FRUITS: Fruit[] = [
  { id: "f1", x: 0, y: 0 },
  { id: "f2", x: 1, y: 0 },
];

function snake(cells: Array<[number, number]>): Point[] {
  return cells.map(([x, y]) => ({ x, y }));
}

function playerPartial(
  cells: Array<[number, number]>,
  direction: Direction,
  extra: Partial<PlayerState> = {},
): Partial<PlayerState> {
  return {
    snake: snake(cells),
    direction,
    nextDirection: direction,
    alive: true,
    score: 0,
    growthPending: 0,
    ...extra,
  };
}

function gameWith(options: {
  p1?: Array<[number, number]>;
  p2?: Array<[number, number]>;
  p1Dir?: Direction;
  p2Dir?: Direction;
  p1Extra?: Partial<PlayerState>;
  p2Extra?: Partial<PlayerState>;
  fruits?: Fruit[];
  random?: () => number;
}) {
  return createTestGame({
    random: options.random ?? (() => 0.99),
    initialState: {
      status: "PLAYING",
      fruits: options.fruits ?? SAFE_FRUITS,
      players: {
        p1: playerPartial(
          options.p1 ?? [
            [5, 20],
            [4, 20],
            [3, 20],
          ],
          options.p1Dir ?? "RIGHT",
          options.p1Extra,
        ),
        p2: playerPartial(
          options.p2 ?? [
            [19, 20],
            [20, 20],
            [21, 20],
          ],
          options.p2Dir ?? "LEFT",
          options.p2Extra,
        ),
      },
    },
  });
}

describe("movement", () => {
  it("moves the snake one cell per tick", () => {
    const game = gameWith({});
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 6, y: 20 });
  });

  it("moves in the current direction", () => {
    const game = gameWith({ p1Dir: "UP", p1: [[5, 12], [5, 13], [5, 14]] });
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 5, y: 11 });
  });

  it("rejects an immediate opposite direction", () => {
    const game = gameWith({ p1Dir: "RIGHT" });
    game.setInput("p1", "LEFT");
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 6, y: 20 });
    expect(game.getState().players.p1.direction).toBe("RIGHT");
  });

  it("accepts a perpendicular turn", () => {
    const game = gameWith({ p1Dir: "RIGHT" });
    game.setInput("p1", "UP");
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 5, y: 19 });
  });

  it("wraps from the left edge to the right", () => {
    const game = gameWith({
      p1: [[0, 5], [1, 5], [2, 5]],
      p1Dir: "LEFT",
    });
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: COLS - 1, y: 5 });
  });

  it("wraps from the right edge to the left", () => {
    const game = gameWith({
      p1: [
        [COLS - 1, 5],
        [COLS - 2, 5],
        [COLS - 3, 5],
      ],
      p1Dir: "RIGHT",
    });
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 0, y: 5 });
  });

  it("wraps from the top edge to the bottom", () => {
    const game = gameWith({
      p1: [[10, 0], [10, 1], [10, 2]],
      p1Dir: "UP",
    });
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 10, y: ROWS - 1 });
  });

  it("wraps from the bottom edge to the top", () => {
    const game = gameWith({
      p1: [
        [10, ROWS - 1],
        [10, ROWS - 2],
        [10, ROWS - 3],
      ],
      p1Dir: "DOWN",
    });
    game.tick();
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 10, y: 0 });
  });
});

describe("wrap helpers", () => {
  it("maps x=-1 to 24 and x=25 to 0", () => {
    expect(wrapPoint({ x: -1, y: 0 })).toEqual({ x: 24, y: 0 });
    expect(wrapPoint({ x: 25, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("maps y=-1 to 39 and y=40 to 0", () => {
    expect(wrapPoint({ x: 0, y: -1 })).toEqual({ x: 0, y: 39 });
    expect(wrapPoint({ x: 0, y: 40 })).toEqual({ x: 0, y: 0 });
  });

  it("does not treat matching directions as opposite", () => {
    expect(isOppositeDirection("LEFT", "LEFT")).toBe(false);
    expect(isOppositeDirection("UP", "LEFT")).toBe(false);
  });

  it("calculates a wrapped next head", () => {
    expect(calculateNextHead({ x: 0, y: 0 }, "LEFT")).toEqual({ x: 24, y: 0 });
  });
});

describe("fruit", () => {
  it("consumes a fruit the new head enters", () => {
    const game = gameWith({
      p1: [[5, 5], [4, 5], [3, 5]],
      p1Dir: "RIGHT",
      fruits: [
        { id: "f1", x: 6, y: 5 },
        { id: "f2", x: 0, y: 0 },
      ],
    });
    game.tick();
    const state = game.getState();
    expect(state.fruits.some((fruit) => fruit.x === 6 && fruit.y === 5)).toBe(false);
    expect(state.players.p1.snake).toHaveLength(4);
    expect(state.players.p1.score).toBe(1);
  });

  it("spawns a replacement fruit that does not overlap a snake", () => {
    const sequence = [6 / COLS, 5 / ROWS, 10 / COLS, 10 / ROWS];
    let i = 0;
    const game = gameWith({
      p1: [[5, 5], [4, 5], [3, 5]],
      p1Dir: "RIGHT",
      fruits: [
        { id: "f1", x: 6, y: 5 },
        { id: "f2", x: 0, y: 0 },
      ],
      random: () => sequence[Math.min(i++, sequence.length - 1)] ?? 0.5,
    });
    game.tick();
    const state = game.getState();
    expect(state.fruits).toHaveLength(2);
    for (const fruit of state.fruits) {
      const onP1 = state.players.p1.snake.some((s) => s.x === fruit.x && s.y === fruit.y);
      const onP2 = state.players.p2.snake.some((s) => s.x === fruit.x && s.y === fruit.y);
      expect(onP1 || onP2).toBe(false);
    }
  });
});

describe("self collision", () => {
  it("kills a snake that hits its own body", () => {
    const game = gameWith({
      p1: [[5, 5], [5, 6], [4, 6], [4, 5], [4, 4]],
      p1Dir: "LEFT",
      p2: [[32, 20], [31, 20], [30, 20]],
      p2Dir: "RIGHT",
    });
    game.tick();
    expect(game.getState().players.p1.alive).toBe(false);
    expect(game.getResult()).toBe("p2_wins");
  });

  it("does not kill when the head enters the vacating tail cell", () => {
    const game = gameWith({
      p1: [[5, 5], [4, 5], [4, 6], [5, 6]],
      p1Dir: "DOWN",
      p2: [[32, 20], [31, 20], [30, 20]],
      p2Dir: "RIGHT",
    });
    game.tick();
    expect(game.getState().players.p1.alive).toBe(true);
    expect(game.getState().players.p1.snake[0]).toEqual({ x: 5, y: 6 });
    expect(game.isFinished()).toBe(false);
  });
});

describe("opponent collision", () => {
  it("kills the attacker that hits opponent body", () => {
    const game = gameWith({
      p1: [[11, 10], [10, 10], [9, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 9], [12, 10], [12, 11], [12, 12]],
      p2Dir: "UP",
    });
    game.tick();
    expect(game.getState().players.p1.alive).toBe(false);
    expect(game.getState().players.p2.alive).toBe(true);
    expect(game.getResult()).toBe("p2_wins");
  });

  it("succeeds as a tail attack when the new head enters the opponent tail", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[14, 10], [13, 10], [12, 10], [11, 10]],
      p2Dir: "RIGHT",
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(true);
    expect(state.players.p1.snake.length).toBe(5);
    expect(state.players.p1.score).toBe(4);
    expect(state.players.p2.snake.length).toBe(2);
  });

  it("consumes at most 2 tail segments", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[16, 10], [15, 10], [14, 10], [13, 10], [12, 10], [11, 10]],
      p2Dir: "RIGHT",
    });
    game.tick();
    expect(game.getState().players.p2.snake.length).toBe(4);
    expect(game.getState().players.p1.score).toBe(4);
    expect(game.getState().players.p1.snake.length).toBe(5);
  });

  it("preserves minimum snake length on tail attack", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 10], [11, 10]],
      p2Dir: "RIGHT",
    });
    game.tick();
    expect(game.getState().players.p2.snake.length).toBe(MIN_SNAKE_LENGTH);
    expect(game.getState().players.p1.score).toBe(0);
    expect(game.getState().players.p1.alive).toBe(true);
  });
});

describe("head collisions", () => {
  it("kills both when heads enter the same cell", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 10], [13, 10], [14, 10]],
      p2Dir: "LEFT",
    });
    game.tick();
    expect(game.getState().players.p1.alive).toBe(false);
    expect(game.getState().players.p2.alive).toBe(false);
    expect(game.getResult()).toBe("draw");
  });

  it("kills both on a head swap", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[11, 10], [12, 10], [13, 10]],
      p2Dir: "LEFT",
    });
    game.tick();
    expect(game.getResult()).toBe("draw");
  });
});

describe("game results", () => {
  it("declares p1 winner when only p2 dies", () => {
    const game = gameWith({
      p1: [[30, 20], [31, 20], [32, 20]],
      p1Dir: "LEFT",
      p2: [[5, 5], [5, 6], [4, 6], [4, 5], [4, 4]],
      p2Dir: "LEFT",
    });
    game.tick();
    expect(game.getResult()).toBe("p1_wins");
  });

  it("declares p2 winner when only p1 dies", () => {
    const game = gameWith({
      p1: [[5, 5], [5, 6], [4, 6], [4, 5], [4, 4]],
      p1Dir: "LEFT",
      p2: [[32, 20], [31, 20], [30, 20]],
      p2Dir: "RIGHT",
    });
    game.tick();
    expect(game.getResult()).toBe("p2_wins");
  });

  it("does not tick after the game is finished", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 10], [13, 10], [14, 10]],
      p2Dir: "LEFT",
    });
    game.tick();
    const tick = game.getState().tick;
    const p1 = game.getState().players.p1.snake[0];
    game.tick();
    expect(game.getState().tick).toBe(tick);
    expect(game.getState().players.p1.snake[0]).toEqual(p1);
  });
});

describe("edge cases", () => {
  it("treats wrapping onto an opponent body as a fatal collision", () => {
    const game = gameWith({
      p1: [[0, 10], [1, 10], [2, 10]],
      p1Dir: "LEFT",
      p2: [
        [COLS - 1, 8],
        [COLS - 1, 9],
        [COLS - 1, 10],
        [COLS - 1, 11],
      ],
      p2Dir: "UP",
    });
    game.tick();
    expect(game.getState().players.p1.alive).toBe(false);
    expect(game.getResult()).toBe("p2_wins");
  });

  it("does not award fruit when both players die on that cell", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 10], [13, 10], [14, 10]],
      p2Dir: "LEFT",
      fruits: [
        { id: "f1", x: 11, y: 10 },
        { id: "f2", x: 0, y: 0 },
      ],
    });
    game.tick();
    expect(game.getResult()).toBe("draw");
    expect(game.getState().players.p1.score).toBe(0);
    expect(game.getState().fruits.some((fruit) => fruit.id === "f1")).toBe(true);
  });

  it("allows simultaneous tail attacks without a draw", () => {
    const game = gameWith({
      p1: [[5, 5], [6, 5], [7, 5], [8, 5]],
      p1Dir: "LEFT",
      p2: [[8, 6], [7, 6], [6, 6], [5, 6], [4, 6], [4, 5]],
      p2Dir: "UP",
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(true);
    expect(state.players.p2.alive).toBe(true);
    expect(state.result).toBeNull();
    expect(state.players.p1.snake.length).toBe(4);
    expect(state.players.p2.snake.length).toBe(6);
  });
});

describe("fruit at collision positions", () => {
  it("awards a tail attack and the fruit when the head lands on a tail cell that also holds a fruit", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[14, 10], [13, 10], [12, 10], [11, 10]],
      p2Dir: "RIGHT",
      fruits: [
        { id: "f1", x: 11, y: 10 },
        { id: "f2", x: 0, y: 0 },
      ],
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(true);
    expect(state.players.p1.snake).toHaveLength(6);
    expect(state.players.p1.score).toBe(5);
    expect(state.players.p2.snake).toHaveLength(2);
    expect(state.fruits.some((fruit) => fruit.x === 11 && fruit.y === 10)).toBe(false);
  });

  it("does not score a fruit when the attacker dies on the fruit cell", () => {
    const game = gameWith({
      p1: [[11, 10], [10, 10], [9, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 9], [12, 10], [12, 11], [12, 12]],
      p2Dir: "UP",
      fruits: [
        { id: "f1", x: 12, y: 10 },
        { id: "f2", x: 0, y: 0 },
      ],
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(false);
    expect(state.players.p1.score).toBe(0);
    expect(game.getResult()).toBe("p2_wins");
    expect(state.fruits.some((fruit) => fruit.id === "f1")).toBe(true);
  });
});

describe("simultaneous deaths", () => {
  it("draws when both players self-collide during the same tick", () => {
    const game = gameWith({
      p1: [[5, 5], [5, 6], [4, 6], [4, 5], [4, 4]],
      p1Dir: "LEFT",
      p2: [[20, 20], [20, 21], [19, 21], [19, 20], [19, 19]],
      p2Dir: "LEFT",
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(false);
    expect(state.players.p2.alive).toBe(false);
    expect(state.result).toBe("draw");
    expect(state.status).toBe("FINISHED");
  });

  it("draws when both heads land on the same tail cell, beating the tail attack", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 10], [13, 10], [11, 10]],
      p2Dir: "LEFT",
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(false);
    expect(state.players.p2.alive).toBe(false);
    expect(state.result).toBe("draw");
    expect(state.status).toBe("FINISHED");
    expect(state.players.p1.score).toBe(0);
  });
});

describe("tail attack on a moving-away tail", () => {
  it("resolves the attack against the start-of-tick tail even when the opponent turns away", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[14, 10], [14, 11], [13, 11], [13, 10], [12, 10], [11, 10]],
      p2Dir: "UP",
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(true);
    expect(state.players.p1.snake).toHaveLength(5);
    expect(state.players.p1.score).toBe(4);
    expect(state.players.p2.snake).toHaveLength(4);
  });
});

describe("growth-pending collision", () => {
  it("kills a player whose head enters its own tail while the tail does not vacate", () => {
    const game = gameWith({
      p1: [[5, 5], [5, 4], [6, 4], [6, 5]],
      p1Dir: "RIGHT",
      p1Extra: { growthPending: 1 },
      p2: [[32, 20], [31, 20], [30, 20]],
      p2Dir: "RIGHT",
    });
    game.tick();
    expect(game.getState().players.p1.alive).toBe(false);
    expect(game.getResult()).toBe("p2_wins");
  });
});

describe("input rules", () => {
  it("ignores input for a dead player", () => {
    const game = gameWith({
      p1: [[5, 5], [5, 6], [4, 6], [4, 5], [4, 4]],
      p1Dir: "LEFT",
      p2: [[32, 20], [31, 20], [30, 20]],
      p2Dir: "RIGHT",
      p1Extra: { alive: false },
    });
    game.setInput("p1", "UP");
    game.tick();
    expect(game.getState().players.p1.direction).toBe("LEFT");
  });

  it("ignores input after the game has finished", () => {
    const game = gameWith({
      p1: [[10, 10], [9, 10], [8, 10]],
      p1Dir: "RIGHT",
      p2: [[12, 10], [13, 10], [14, 10]],
      p2Dir: "LEFT",
    });
    game.tick();
    expect(game.getResult()).toBe("draw");
    game.setInput("p1", "UP");
    game.tick();
    const state = game.getState();
    expect(state.players.p1.direction).toBe("RIGHT");
    expect(state.tick).toBe(1);
  });
});

describe("score accumulation", () => {
  it("adds fruit scores across several ticks", () => {
    const game = gameWith({
      p1: [[5, 5], [4, 5], [3, 5]],
      p1Dir: "RIGHT",
      p2: [[32, 20], [31, 20], [30, 20]],
      p2Dir: "RIGHT",
      fruits: [
        { id: "f1", x: 6, y: 5 },
        { id: "f2", x: 8, y: 5 },
      ],
    });
    game.tick();
    game.tick();
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(true);
    expect(state.players.p1.snake).toHaveLength(5);
    expect(state.players.p1.score).toBe(2);
  });
});

describe("wrapping tail attack", () => {
  it("attacks an opponent tail after wrapping around the board", () => {
    const game = gameWith({
      p1: [[0, 10], [1, 10], [2, 10]],
      p1Dir: "LEFT",
      p2: [[24, 7], [24, 8], [24, 9], [24, 10]],
      p2Dir: "UP",
    });
    game.tick();
    const state = game.getState();
    expect(state.players.p1.alive).toBe(true);
    expect(state.players.p1.snake).toHaveLength(5);
    expect(state.players.p1.score).toBe(4);
    expect(state.players.p2.snake).toHaveLength(2);
  });
});

describe("randomized starting positions", () => {
  it("uses fresh random spawns when randomizePlayers is enabled", () => {
    const make = () =>
      createTestGame({ random: lcg(11), randomizePlayers: true }).getState();
    const a = make();
    const b = createTestGame({
      random: lcg(11),
      randomizePlayers: true,
      initialState: { status: "PLAYING" },
    }).getState();
    expect(a.players.p1.snake).toHaveLength(3);
    for (const player of [a.players.p1, a.players.p2]) {
      for (const cell of player.snake) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(COLS);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeLessThan(ROWS);
      }
    }
    expect(a.players.p1.snake[0]).not.toEqual(a.players.p2.snake[0]);
    expect(b.players.p1.snake[0]).toEqual(a.players.p1.snake[0]);
  });

  it("keeps the canonical fixed starts when randomizePlayers is off", () => {
    const state = createTestGame({ random: lcg(11) }).getState();
    expect(state.players.p1.snake[0]).toEqual(P1_START.snake[0]);
    expect(state.players.p2.snake[0]).toEqual(P2_START.snake[0]);
  });
});

describe("determinism", () => {
  it("produces identical states across runs with the same injected RNG and fruit layout", () => {
    const run = () => {
      const game = gameWith({});
      const states = [];
      for (let i = 0; i < 5; i++) {
        game.tick();
        states.push(game.getState());
      }
      return states;
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });
});
