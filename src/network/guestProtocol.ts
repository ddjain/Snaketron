import type { GameResult, GameState } from "../game/types.ts";
import type { ErrorCode } from "./protocol.ts";
import { gameStateFromNetwork } from "./serialize.ts";
import { parseHostMessage } from "./validation.ts";

export type GuestScreen = "home" | "lobby" | "countdown" | "playing" | "gameover";

export type GuestView = {
  screen: GuestScreen;
  connectionStatus: string;
  countdown: number | null;
  gameState: GameState | null;
  result: GameResult | null;
  error: string | null;
  errorCode: ErrorCode | null;
  disconnectNote: string | null;
};

export type HostPayloadResult = {
  transition: Partial<GuestView>;
  teardown: boolean;
};

export function createGuestView(): GuestView {
  return {
    screen: "home",
    connectionStatus: "",
    countdown: null,
    gameState: null,
    result: null,
    error: null,
    errorCode: null,
    disconnectNote: null,
  };
}

export function applyHostPayload(raw: unknown, current: GuestView): HostPayloadResult {
  const record = parseHostMessage(raw);
  if (!record) {
    return { transition: {}, teardown: false };
  }

  if (record.type === "connected") {
    return { transition: { connectionStatus: "Connected", screen: "lobby" }, teardown: false };
  }

  if (record.type === "countdown" && typeof record.value === "number") {
    return { transition: { screen: "countdown", countdown: record.value }, teardown: false };
  }

  if (record.type === "state") {
    const gameState = gameStateFromNetwork(record as Parameters<typeof gameStateFromNetwork>[0]);
    const screen: GuestScreen = gameState.status === "FINISHED" ? "gameover" : "playing";
    return {
      transition: {
        gameState,
        screen: record.status === "COUNTDOWN" ? "countdown" : screen,
        connectionStatus: "Connected",
      },
      teardown: false,
    };
  }

  if (record.type === "game_over") {
    const scores = record.scores as { p1: number; p2: number } | undefined;
    const result = record.result as GameResult;
    const gameState = current.gameState
      ? {
          ...current.gameState,
          result,
          status: "FINISHED" as const,
          players: {
            p1: {
              ...current.gameState.players.p1,
              score: scores?.p1 ?? current.gameState.players.p1.score,
            },
            p2: {
              ...current.gameState.players.p2,
              score: scores?.p2 ?? current.gameState.players.p2.score,
            },
          },
        }
      : current.gameState;
    return { transition: { screen: "gameover", result, gameState }, teardown: false };
  }

  if (record.type === "error") {
    const code = record.code as ErrorCode;
    const message =
      code === "GAME_FULL"
        ? "Game already full."
        : typeof record.message === "string"
          ? record.message
          : "Unable to connect.";
    return {
      transition: {
        screen: "home",
        error: message,
        errorCode: code,
        connectionStatus: "Connection failed",
      },
      teardown: true,
    };
  }

  return { transition: {}, teardown: false };
}