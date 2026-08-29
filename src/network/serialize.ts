import type { Fruit, GameState, GameStatus, Point } from "../game/types.ts";
import type { HostToGuestMessage } from "./protocol.ts";

export type StateMessage = {
  type: "state";
  tick: number;
  status: GameStatus;
  players: {
    p1: { snake: Point[]; score: number; alive: boolean };
    p2: { snake: Point[]; score: number; alive: boolean };
  };
  fruits: Fruit[];
};

export function toStateMessage(state: GameState): StateMessage {
  return {
    type: "state",
    tick: state.tick,
    status: state.status,
    players: {
      p1: {
        snake: state.players.p1.snake,
        score: state.players.p1.score,
        alive: state.players.p1.alive,
      },
      p2: {
        snake: state.players.p2.snake,
        score: state.players.p2.score,
        alive: state.players.p2.alive,
      },
    },
    fruits: state.fruits,
  };
}

export function toGameOverMessage(state: GameState): HostToGuestMessage | null {
  if (!state.result) {
    return null;
  }
  return {
    type: "game_over",
    result: state.result,
    scores: {
      p1: state.players.p1.score,
      p2: state.players.p2.score,
    },
  };
}

export function gameStateFromNetwork(message: {
  tick: number;
  status: GameState["status"];
  players: {
    p1: { snake: GameState["players"]["p1"]["snake"]; score: number; alive: boolean };
    p2: { snake: GameState["players"]["p2"]["snake"]; score: number; alive: boolean };
  };
  fruits: GameState["fruits"];
}): GameState {
  return {
    tick: message.tick,
    status: message.status,
    result: null,
    fruits: message.fruits,
    players: {
      p1: {
        id: "p1",
        direction: "RIGHT",
        nextDirection: "RIGHT",
        snake: message.players.p1.snake,
        score: message.players.p1.score,
        alive: message.players.p1.alive,
        growthPending: 0,
      },
      p2: {
        id: "p2",
        direction: "LEFT",
        nextDirection: "LEFT",
        snake: message.players.p2.snake,
        score: message.players.p2.score,
        alive: message.players.p2.alive,
        growthPending: 0,
      },
    },
  };
}
