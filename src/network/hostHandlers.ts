import { GameEngine } from "../game/gameEngine.ts";
import { parseGuestMessage } from "./validation.ts";

export function handleHostIncoming(
  engine: GameEngine,
  raw: unknown,
  options: { allowRestart: boolean },
): { accepted: boolean; error?: string; action?: "input" | "restart" } {
  const parsed = parseGuestMessage(raw);
  if (!parsed.ok) {
    return { accepted: false, error: parsed.message };
  }

  if (parsed.message.type === "input") {
    engine.setInput("p2", parsed.message.direction);
    return { accepted: true, action: "input" };
  }

  if (parsed.message.type === "restart") {
    if (!options.allowRestart) {
      return { accepted: false, error: "Restart is only valid after the game has finished." };
    }
    return { accepted: true, action: "restart" };
  }

  return { accepted: false, error: "Invalid message." };
}
