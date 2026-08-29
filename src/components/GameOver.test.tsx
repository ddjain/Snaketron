import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GameOver } from "./GameOver.tsx";

function renderGameOver(props: Partial<Parameters<typeof GameOver>[0]>) {
  const handlers = {
    onPlayAgain: vi.fn(),
    onHome: vi.fn(),
  };
  render(
    <GameOver
      result={null}
      p1Score={0}
      p2Score={0}
      disconnectNote={null}
      onPlayAgain={handlers.onPlayAgain}
      onHome={handlers.onHome}
      {...props}
    />,
  );
  return handlers;
}

describe("GameOver", () => {
  it("announces a draw", () => {
    renderGameOver({ result: "draw" });
    expect(screen.getByRole("dialog")).toHaveTextContent("DRAW!");
    expect(screen.getByText("Both snakes were eliminated.")).toBeInTheDocument();
  });

  it("announces player 1 as the winner", () => {
    renderGameOver({ result: "p1_wins" });
    expect(screen.getByRole("dialog")).toHaveTextContent("PLAYER 1 WINS!");
  });

  it("announces player 2 as the winner", () => {
    renderGameOver({ result: "p2_wins" });
    expect(screen.getByRole("dialog")).toHaveTextContent("PLAYER 2 WINS!");
  });

  it("shows a disconnect message instead of a win title", () => {
    renderGameOver({ result: null, disconnectNote: "Game ended. Host disconnected." });
    expect(screen.getByRole("dialog")).toHaveTextContent("Game ended. Host disconnected.");
  });

  it("shows the final scores", () => {
    renderGameOver({ result: "draw", p1Score: 4, p2Score: 9 });
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("calls the play-again and home handlers", async () => {
    const user = userEvent.setup();
    const handlers = renderGameOver({ result: "p1_wins" });
    await user.click(screen.getByRole("button", { name: "Play again" }));
    expect(handlers.onPlayAgain).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Home" }));
    expect(handlers.onHome).toHaveBeenCalledTimes(1);
  });
});