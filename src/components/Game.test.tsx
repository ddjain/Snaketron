import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import type { GameState } from "../game/types.ts";
import { Game } from "./Game.tsx";

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

function renderGame(overrides: Partial<Parameters<typeof Game>[0]>) {
  render(
    <Game
      gameState={playingState()}
      role="host"
      screen="playing"
      countdown={null}
      result={null}
      disconnectNote={null}
      connectionStatus="Connected"
      onPlayAgain={() => {}}
      onHome={() => {}}
      {...overrides}
    />,
  );
}

describe("Game", () => {
  it("renders the board canvas and status text", () => {
    renderGame({});
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("40 by 25"),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Connected");
  });

  it("shows the countdown number", () => {
    renderGame({ screen: "countdown", countdown: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows GO! when the countdown reaches zero", () => {
    renderGame({ screen: "countdown", countdown: 0 });
    expect(screen.getByText("GO!")).toBeInTheDocument();
  });

  it("shows host controls for player 1", () => {
    renderGame({ role: "host" });
    expect(screen.getByText("You are Player 1. Move with W A S D.")).toBeInTheDocument();
  });

  it("shows guest controls for player 2", () => {
    renderGame({ role: "guest" });
    expect(screen.getByText("You are Player 2. Move with the arrow keys.")).toBeInTheDocument();
  });

  it("shows the game-over dialog when the game is finished", () => {
    renderGame({ screen: "gameover", result: "p1_wins" });
    expect(screen.getByRole("dialog")).toHaveTextContent("PLAYER 1 WINS!");
  });
});