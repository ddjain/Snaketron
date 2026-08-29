import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Lobby } from "./Lobby.tsx";

const originalClipboard = globalThis.navigator.clipboard;

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: originalClipboard,
    configurable: true,
  });
});

describe("Lobby", () => {
  it("shows the game code to a host and prompts to share it", () => {
    render(<Lobby code="X7K92" status="Waiting for opponent..." isHost onHome={() => {}} />);
    expect(screen.getByLabelText("Game code X7K92")).toHaveTextContent("X7K92");
    expect(screen.getByText("Share this code with Player 2.")).toBeInTheDocument();
    expect(screen.getByText("Waiting for opponent...")).toBeInTheDocument();
  });

  it("shows a copy button when the clipboard is available and copies the code", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<Lobby code="X7K92" status="" isHost onHome={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("X7K92");
  });

  it("hides the copy button on a host without clipboard support", () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<Lobby code="X7K92" status="" isHost onHome={() => {}} />);
    expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
  });

  it("shows a guest waiting message", () => {
    render(<Lobby code="X7K92" status="Connected" isHost={false} onHome={() => {}} />);
    expect(screen.getByText("Connected! Waiting for game...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
  });

  it("calls onHome when the Home button is clicked", () => {
    const onHome = vi.fn();
    render(<Lobby code="X7K92" status="" isHost={false} onHome={onHome} />);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});