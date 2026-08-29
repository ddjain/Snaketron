import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.tsx";

describe("App", () => {
  it("renders the home screen initially", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Create game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join game" })).toBeInTheDocument();
    expect(screen.getByLabelText("Enter game code")).toBeInTheDocument();
  });
});