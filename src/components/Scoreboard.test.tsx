import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import type { GameState } from "../game/types.ts";
import { Scoreboard } from "./Scoreboard.tsx";

function stateWith(options: {
  p1Alive: boolean;
  p2Alive: boolean;
  p1Score?: number;
  p2Score?: number;
}): GameState {
  const game = createTestGame({
    random: () => 0.99,
    initialState: {
      status: "PLAYING",
      fruits: [
        { id: "f1", x: 0, y: 0 },
        { id: "f2", x: 1, y: 0 },
      ],
    },
  });
  const state = game.getState();
  state.players.p1.alive = options.p1Alive;
  state.players.p2.alive = options.p2Alive;
  state.players.p1.score = options.p1Score ?? 0;
  state.players.p2.score = options.p2Score ?? 0;
  return state;
}

describe("Scoreboard", () => {
  it("renders the score for both players", () => {
    render(<Scoreboard gameState={stateWith({ p1Alive: true, p2Alive: true, p1Score: 3, p2Score: 7 })} />);
    expect(screen.getByText("Player 1")).toBeInTheDocument();
    expect(screen.getByText("Player 2")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
  });

  it("marks an eliminated player", () => {
    render(<Scoreboard gameState={stateWith({ p1Alive: false, p2Alive: true })} />);
    expect(screen.getByText("Eliminated")).toBeInTheDocument();
  });

  it("does not mark a live player as eliminated", () => {
    render(<Scoreboard gameState={stateWith({ p1Alive: true, p2Alive: true })} />);
    expect(screen.queryByText("Eliminated")).not.toBeInTheDocument();
  });
});