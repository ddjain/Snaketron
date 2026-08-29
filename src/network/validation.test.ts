import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import { generateGameCode, isValidGameCode, peerIdFromCode } from "./gameCode.ts";
import { handleHostIncoming } from "./hostHandlers.ts";
import { parseGuestMessage } from "./validation.ts";

describe("guest message validation", () => {
  it("accepts a valid input message", () => {
    const parsed = parseGuestMessage({ type: "input", direction: "UP" });
    expect(parsed).toEqual({ ok: true, message: { type: "input", direction: "UP" } });
  });

  it("rejects an invalid direction", () => {
    const parsed = parseGuestMessage({ type: "input", direction: "FORWARD" });
    expect(parsed.ok).toBe(false);
  });

  it("rejects an unknown message type", () => {
    const parsed = parseGuestMessage({ type: "explode" });
    expect(parsed.ok).toBe(false);
  });

  it("handles malformed JSON safely", () => {
    const parsed = parseGuestMessage("{not json");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.message).toMatch(/malformed/i);
    }
  });

  it("rejects oversized messages", () => {
    const parsed = parseGuestMessage(`{"type":"input","direction":"UP","pad":"${"x".repeat(20_000)}"}`);
    expect(parsed.ok).toBe(false);
  });
});

describe("host incoming handlers", () => {
  it("applies guest input as p2 only", () => {
    const game = createTestGame({
      initialState: {
        status: "PLAYING",
        fruits: [
          { id: "f1", x: 0, y: 0 },
          { id: "f2", x: 1, y: 0 },
        ],
      },
    });
    const result = handleHostIncoming(game, { type: "input", direction: "UP" }, { allowRestart: false });
    expect(result.accepted).toBe(true);
    game.tick();
    expect(game.getState().players.p2.direction).toBe("UP");
    expect(game.getState().players.p1.direction).toBe("RIGHT");
  });

  it("ignores playerId spoofing fields", () => {
    const game = createTestGame({
      initialState: {
        status: "PLAYING",
        fruits: [
          { id: "f1", x: 0, y: 0 },
          { id: "f2", x: 1, y: 0 },
        ],
      },
    });
    handleHostIncoming(
      game,
      { type: "input", direction: "DOWN", playerId: "p1" },
      { allowRestart: false },
    );
    game.tick();
    expect(game.getState().players.p1.direction).toBe("RIGHT");
    expect(game.getState().players.p2.direction).toBe("DOWN");
  });

  it("rejects restart before the game is finished", () => {
    const game = createTestGame({ initialState: { status: "PLAYING" } });
    const result = handleHostIncoming(game, { type: "restart" }, { allowRestart: false });
    expect(result.accepted).toBe(false);
  });

  it("accepts restart after finished", () => {
    const game = createTestGame({ initialState: { status: "FINISHED" } });
    const result = handleHostIncoming(game, { type: "restart" }, { allowRestart: true });
    expect(result.accepted).toBe(true);
  });
});

describe("game codes", () => {
  it("generates a short uppercase code", () => {
    const code = generateGameCode(() => 0);
    expect(code).toHaveLength(5);
    expect(isValidGameCode(code)).toBe(true);
  });

  it("maps a room code to a namespaced PeerJS id", () => {
    expect(peerIdFromCode("X7K92")).toBe("snakehunt-X7K92");
  });
});
