import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Home } from "./Home.tsx";

function renderHome(overrides: Partial<Parameters<typeof Home>[0]> = {}) {
  const handlers = {
    onJoinInput: vi.fn(),
    onCreate: vi.fn(),
    onJoin: vi.fn(),
  };
  render(
    <Home
      joinInput=""
      error={null}
      onJoinInput={handlers.onJoinInput}
      onCreate={handlers.onCreate}
      onJoin={handlers.onJoin}
      {...overrides}
    />,
  );
  return handlers;
}

describe("Home", () => {
  it("renders the create and join actions", () => {
    renderHome();
    expect(screen.getByRole("button", { name: "Create game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join game" })).toBeInTheDocument();
    expect(screen.getByLabelText("Enter game code")).toBeInTheDocument();
  });

  it("calls onCreate when the create button is clicked", async () => {
    const user = userEvent.setup();
    const handlers = renderHome();
    await user.click(screen.getByRole("button", { name: "Create game" }));
    expect(handlers.onCreate).toHaveBeenCalledTimes(1);
  });

  it("reports join input changes", async () => {
    const user = userEvent.setup();
    const handlers = renderHome();
    await user.type(screen.getByLabelText("Enter game code"), "X7K92");
    expect(handlers.onJoinInput).toHaveBeenCalledTimes(5);
  });

  it("joins on form submit", async () => {
    const user = userEvent.setup();
    const handlers = renderHome({ joinInput: "X7K92" });
    await user.click(screen.getByRole("button", { name: "Join game" }));
    expect(handlers.onJoin).toHaveBeenCalledTimes(1);
  });

  it("announces an error", () => {
    renderHome({ error: "Invalid game code." });
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid game code.");
  });
});