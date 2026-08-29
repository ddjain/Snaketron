import { TICK_MS } from "../game/constants.ts";
import { GameEngine } from "../game/gameEngine.ts";
import type { GameResult, GameState } from "../game/types.ts";
import { handleHostIncoming } from "./hostHandlers.ts";
import { toGameOverMessage, toStateMessage } from "./serialize.ts";

export type HostConnection = {
  open?: boolean;
  send(message: unknown): void;
};

export type HostTimers = {
  setInterval(callback: () => void, ms: number): number;
  clearInterval(handle: number): void;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(handle: number): void;
};

const COUNTDOWN_VALUES: Array<0 | 1 | 2 | 3> = [3, 2, 1, 0];
export const COUNTDOWN_STEPS = COUNTDOWN_VALUES.length;

export type HostFrame = {
  gameState: GameState;
  countdown: 0 | 1 | 2 | 3 | null;
  result: GameResult | null;
};

export type HostSessionOptions = {
  conn: HostConnection;
  onFrame: (frame: HostFrame) => void;
  tickMs?: number;
  countdownMs?: number;
  timers?: HostTimers;
  createEngine?: () => GameEngine;
};

function browserTimers(): HostTimers {
  return {
    setInterval: (callback, ms) => window.setInterval(callback, ms),
    clearInterval: (handle) => window.clearInterval(handle),
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle),
  };
}

export class HostSession {
  private engine: GameEngine;
  private readonly conn: HostConnection;
  private readonly onFrame: (frame: HostFrame) => void;
  private readonly timers: HostTimers;
  private readonly tickMs: number;
  private readonly countdownMs: number;
  private readonly createEngine: () => GameEngine;
  private tickInterval: number | null = null;
  private countdownTimeout: number | null = null;

  constructor(options: HostSessionOptions) {
    this.conn = options.conn;
    this.onFrame = options.onFrame;
    this.timers = options.timers ?? browserTimers();
    this.tickMs = options.tickMs ?? TICK_MS;
    this.countdownMs = options.countdownMs ?? 900;
    this.createEngine = options.createEngine ?? (() => new GameEngine());
    this.engine = this.createEngine();
  }

  getState(): GameState {
    return this.engine.getState();
  }

  start(): void {
    this.stopTimers();
    this.engine = this.createEngine();
    this.engine.setStatus("COUNTDOWN");

    let index = 0;
    const sendNext = () => {
      if (index >= COUNTDOWN_VALUES.length) {
        this.engine.setStatus("PLAYING");
        this.broadcast(null);
        this.startTick();
        return;
      }
      const value = COUNTDOWN_VALUES[index];
      index += 1;
      if (this.conn.open) {
        this.conn.send({ type: "countdown", value });
      }
      this.broadcast(value);
      this.countdownTimeout = this.timers.setTimeout(sendNext, this.countdownMs);
    };

    sendNext();
  }

  startTick(): void {
    this.stopTimers();
    this.tickInterval = this.timers.setInterval(() => {
      this.engine.tick();
      this.broadcast(null);
    }, this.tickMs);
  }

  broadcast(countdown: 0 | 1 | 2 | 3 | null): void {
    const state = this.engine.getState();
    if (this.conn.open) {
      this.conn.send(toStateMessage(state));
    }
    if (this.engine.isFinished()) {
      this.stopTimers();
      const over = toGameOverMessage(state);
      if (over && this.conn.open) {
        this.conn.send(over);
      }
      this.onFrame({ gameState: state, countdown: null, result: state.result });
      return;
    }
    this.onFrame({ gameState: state, countdown, result: null });
  }

  handleRaw(raw: unknown): { accepted: boolean } {
    const allowRestart = this.engine.isFinished();
    const handled = handleHostIncoming(this.engine, raw, { allowRestart });
    if (!handled.accepted) {
      if (this.conn.open) {
        this.conn.send({
          type: "error",
          code: "INVALID_MESSAGE",
          message: handled.error ?? "Invalid message.",
        });
      }
      return { accepted: false };
    }
    if (handled.action === "restart") {
      this.start();
    }
    return { accepted: true };
  }

  dispatchHostInput(direction: import("../game/types.ts").Direction): void {
    this.engine.setInput("p1", direction);
  }

  stop(): void {
    this.stopTimers();
  }

  private stopTimers(): void {
    if (this.tickInterval !== null) {
      this.timers.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.countdownTimeout !== null) {
      this.timers.clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }
  }
}