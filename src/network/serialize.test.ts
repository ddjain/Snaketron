import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import type { GameState } from "../game/types.ts";
import { gameStateFromNetwork, toGameOverMessage, toStateMessage } from "./serialize.ts";

function playingState(fruits: GameState["fruits"] = [
  { id: "f1", x: 0, y: 0 },
  { id: "f2", x: 1, y: 0 },
]): GameState {
  return createTestGame({
    random: () => 0.99,
    initialState: { status: "PLAYING", fruits },
  }).getState();
}

function finishedState(): GameState {
  const game = createTestGame({
    random: () => 0.99,
    initialState: {
      status: "PLAYING",
      fruits: [
        { id: "f1", x: 0, y: 0 },
        { id: "f2", x: 1, y: 0 },
      ],
      players: {
        p1: {
          snake: [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 },
          ],
          direction: "RIGHT",
          nextDirection: "RIGHT",
        },
        p2: {
          snake: [
            { x: 12, y: 10 },
            { x: 13, y: 10 },
            { x: 14, y: 10 },
          ],
          direction: "LEFT",
          nextDirection: "LEFT",
        },
      },
    },
  });
  game.tick();
  expect(game.getState().result).toBe("draw");
  return game.getState();
}

describe("state serialization", () => {
  it("builds a state message without engine-internal fields", () => {
    const state = playingState();
    const msg = toStateMessage(state);
    expect(msg.type).toBe("state");
    expect(msg.tick).toBe(0);
    expect(msg.status).toBe("PLAYING");
    expect(msg.players.p1).toEqual({
      snake: state.players.p1.snake,
      score: state.players.p1.score,
      alive: state.players.p1.alive,
    });
    expect(msg.players.p2).toEqual({
      snake: state.players.p2.snake,
      score: state.players.p2.score,
      alive: state.players.p2.alive,
    });
    expect(msg.fruits).toEqual(state.fruits);
    expect(msg.players.p1).not.toHaveProperty("direction");
  });

  it("reconstructs a game state from a network state message", () => {
    const msg = toStateMessage(playingState());
    const state = gameStateFromNetwork(msg);
    expect(state.players.p1.id).toBe("p1");
    expect(state.players.p1.snake).toEqual(msg.players.p1.snake);
    expect(state.players.p1.score).toBe(msg.players.p1.score);
    expect(state.players.p2.id).toBe("p2");
    expect(state.players.p2.snake).toEqual(msg.players.p2.snake);
    expect(state.fruits).toEqual(msg.fruits);
    expect(state.tick).toBe(0);
    expect(state.result).toBeNull();
  });
});

describe("game-over serialization", () => {
  it("returns null while the game is still active", () => {
    expect(toGameOverMessage(playingState())).toBeNull();
  });

  it("builds a game-over message from a finished state", () => {
    const state = finishedState();
    expect(toGameOverMessage(state)).toEqual({
      type: "game_over",
      result: "draw",
      scores: { p1: 0, p2: 0 },
    });
  });
});