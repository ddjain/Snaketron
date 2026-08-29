import type { Direction, Fruit, GameResult, GameStatus, Point } from "../game/types.ts";

export type GuestToHostMessage =
  | { type: "input"; direction: Direction }
  | { type: "restart" };

export type ErrorCode =
  | "INVALID_MESSAGE"
  | "GAME_FULL"
  | "GAME_NOT_FOUND"
  | "UNABLE_TO_CONNECT"
  | "INVALID_GAME_CODE";

export type HostToGuestMessage =
  | { type: "connected"; playerId: "p2" }
  | { type: "countdown"; value: 0 | 1 | 2 | 3 }
  | {
      type: "state";
      tick: number;
      status: GameStatus;
      players: {
        p1: { snake: Point[]; score: number; alive: boolean };
        p2: { snake: Point[]; score: number; alive: boolean };
      };
      fruits: Fruit[];
    }
  | { type: "game_over"; result: GameResult; scores: { p1: number; p2: number } }
  | { type: "error"; code: ErrorCode; message: string };

export type ProtocolMessage = GuestToHostMessage | HostToGuestMessage;

export function isDirection(value: unknown): value is Direction {
  return value === "UP" || value === "DOWN" || value === "LEFT" || value === "RIGHT";
}
