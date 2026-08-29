import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import type { GameState } from "../game/types.ts";
import { applyHostPayload, createGuestView, type GuestView } from "./guestProtocol.ts";
import { toStateMessage } from "./serialize.ts";

function playingState(): GameState {
  return createTestGame({
    random: () => 0.99,
    initialState: {
      status: "PLAYING",
      fruits: [
        { id: "f1", x: 0, y: 0 },
        { id: "f2", x: 1, y: 0 },
      ],
    },
  }).getState();
}

function stateWithCurrent(): { current: GuestView; state: GameState } {
  const state = playingState();
  return {
    current: { ...createGuestView(), gameState: state, screen: "playing" },
    state,
  };
}

describe("applyHostPayload", () => {
  it("ignores malformed and unknown payloads", () => {
    const current = createGuestView();
    expect(applyHostPayload("{not json", current)).toEqual({ transition: {}, teardown: false });
    expect(applyHostPayload({ type: "explode" }, current)).toEqual({ transition: {}, teardown: false });
    expect(applyHostPayload(null, current)).toEqual({ transition: {}, teardown: false });
  });

  it("recognizes the connection handshake", () => {
    const { transition } = applyHostPayload({ type: "connected", playerId: "p2" }, createGuestView());
    expect(transition).toEqual({ screen: "lobby", connectionStatus: "Connected" });
  });

  it("applies a countdown value", () => {
    const { transition } = applyHostPayload({ type: "countdown", value: 3 }, createGuestView());
    expect(transition).toEqual({ screen: "countdown", countdown: 3 });
  });

  it("applies a playing state message", () => {
    const msg = toStateMessage(playingState());
    const { transition, teardown } = applyHostPayload(msg, createGuestView());
    expect(teardown).toBe(false);
    expect(transition.screen).toBe("playing");
    expect(transition.connectionStatus).toBe("Connected");
    expect(transition.gameState?.players.p1.snake).toEqual(msg.players.p1.snake);
    expect(transition.gameState?.tick).toBe(0);
  });

  it("keeps the countdown screen for a countdown state message", () => {
    const state = playingState();
    state.status = "COUNTDOWN";
    const { transition } = applyHostPayload(toStateMessage(state), createGuestView());
    expect(transition.screen).toBe("countdown");
  });

  it("applies a game-over message with scores to the current state", () => {
    const { current } = stateWithCurrent();
    const { transition } = applyHostPayload(
      { type: "game_over", result: "p1_wins", scores: { p1: 4, p2: 2 } },
      current,
    );
    expect(transition.screen).toBe("gameover");
    expect(transition.result).toBe("p1_wins");
    expect(transition.gameState?.result).toBe("p1_wins");
    expect(transition.gameState?.status).toBe("FINISHED");
    expect(transition.gameState?.players.p1.score).toBe(4);
    expect(transition.gameState?.players.p2.score).toBe(2);
  });

  it("hands back a game-over result when no state was ever received", () => {
    const { transition, teardown } = applyHostPayload(
      { type: "game_over", result: "p2_wins", scores: { p1: 0, p2: 0 } },
      createGuestView(),
    );
    expect(transition.screen).toBe("gameover");
    expect(transition.result).toBe("p2_wins");
    expect(transition.gameState).toBeNull();
    expect(teardown).toBe(false);
  });

  it("returns to home with a message on a GAME_FULL error", () => {
    const { transition, teardown } = applyHostPayload(
      { type: "error", code: "GAME_FULL", message: "Game already full." },
      createGuestView(),
    );
    expect(teardown).toBe(true);
    expect(transition).toEqual({
      screen: "home",
      error: "Game already full.",
      errorCode: "GAME_FULL",
      connectionStatus: "Connection failed",
    });
  });

  it("passes through a generic error message", () => {
    const { transition, teardown } = applyHostPayload(
      { type: "error", code: "INVALID_GAME_CODE", message: "Invalid code." },
      createGuestView(),
    );
    expect(teardown).toBe(true);
    expect(transition.error).toBe("Invalid code.");
    expect(transition.errorCode).toBe("INVALID_GAME_CODE");
  });
});