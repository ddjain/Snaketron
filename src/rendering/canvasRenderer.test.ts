import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import type { GameState } from "../game/types.ts";
import { renderGame } from "./canvasRenderer.ts";

type Call = { method: string; args: unknown[]; fillStyle: string };

function createContextStub() {
  const calls: Call[] = [];
  const context: Record<string, unknown> = { fillStyle: "", strokeStyle: "", lineWidth: 1 };
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args, fillStyle: String(context.fillStyle) });
    };
  context.fillRect = record("fillRect");
  context.fill = record("fill");
  context.stroke = record("stroke");
  context.beginPath = record("beginPath");
  context.moveTo = record("moveTo");
  context.lineTo = record("lineTo");
  context.arc = record("arc");
  return {
    stub: context as unknown as CanvasRenderingContext2D,
    calls,
  };
}

function playingState(): GameState {
  return createTestGame({
    random: () => 0.99,
    initialState: {
      status: "PLAYING",
      fruits: [
        { id: "f1", x: 3, y: 3 },
        { id: "f2", x: 20, y: 20 },
      ],
    },
  }).getState();
}

describe("canvas renderer", () => {
  it("renders the background, grid, fruits, and both snakes without throwing", () => {
    const { stub, calls } = createContextStub();
    renderGame(stub, playingState(), 400, 200);
    const fillRects = calls.filter((call) => call.method === "fillRect");
    const fruitArcs = calls.filter((call) => call.method === "arc" && call.fillStyle === "#ff5c7a");
    const gridLines = calls.filter((call) => call.method === "moveTo" || call.method === "lineTo");
    expect(fillRects.length).toBe(7);
    expect(fruitArcs.length).toBe(2);
    expect(gridLines.length).toBeGreaterThan(0);
  });

  it("paints the snake head with the head color and fruit in the fruit color", () => {
    const { stub, calls } = createContextStub();
    renderGame(stub, playingState(), 400, 200);
    const fillRects = calls.filter((call) => call.method === "fillRect");
    const fruitArcs = calls.filter((call) => call.method === "arc" && call.fillStyle === "#ff5c7a");
    expect(fillRects[0].fillStyle).toBe("#070b14");
    expect(fillRects[1].fillStyle).toBe("#b6ffd4");
    expect(fillRects[4].fillStyle).toBe("#c6e2ff");
    expect(fruitArcs.length).toBe(2);
  });
});