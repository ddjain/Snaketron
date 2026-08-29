import { describe, expect, it } from "vitest";
import { joinCodeFromSearch, joinUrlFromPageUrl } from "./joinLink.ts";

describe("joinUrlFromPageUrl", () => {
  it("appends the normalized code as a query parameter", () => {
    expect(joinUrlFromPageUrl("https://ddjain.github.io/Snaketron/", "x7k92")).toBe(
      "https://ddjain.github.io/Snaketron/?code=X7K92",
    );
  });

  it("preserves the existing page path under GitHub Pages", () => {
    expect(joinUrlFromPageUrl("https://ddjain.github.io/Snaketron/index.html", "ABC12")).toBe(
      "https://ddjain.github.io/Snaketron/index.html?code=ABC12",
    );
  });
});

describe("joinCodeFromSearch", () => {
  it("extracts a valid code case-insensitively", () => {
    expect(joinCodeFromSearch("?code=x7k92")).toBe("X7K92");
  });

  it("returns null when no code is present", () => {
    expect(joinCodeFromSearch("")).toBeNull();
    expect(joinCodeFromSearch("?foo=bar")).toBeNull();
  });

  it("rejects codes that fail validation", () => {
    expect(joinCodeFromSearch("?code=OOO11")).toBeNull();
    expect(joinCodeFromSearch("?code=ABC12")).toBeNull();
    expect(joinCodeFromSearch("?code=%%%")).toBeNull();
  });
});