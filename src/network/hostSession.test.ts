import { describe, expect, it } from "vitest";
import { createTestGame } from "../game/gameEngine.ts";
import { HostSession, type HostConnection, type HostTimers } from "./hostSession.ts";

const SAFE_FRUITS = [
  { id: "f1", x: 0, y: 0 },
  { id: "f2", x: 1, y: 0 },
];

function createFakeConnection() {
  const sent: unknown[] = [];
  return {
    open: true,
    sent,
    send(message: unknown) {
      sent.push(message);
    },
  } as HostConnection & { sent: unknown[] };
}

function createFakeTimers() {
  let nextId = 1;
  const intervals = new Map<number, () => void>();
  const timeouts = new Map<number, () => void>();
  return {
    handle: {
      setInterval(callback: () => void): number {
        const id = nextId++;
        intervals.set(id, callback);
        return id;
      },
      clearInterval(id: number) {
        intervals.delete(id);
      },
      setTimeout(callback: () => void): number {
        const id = nextId++;
        timeouts.set(id, callback);
        return id;
      },
      clearTimeout(id: number) {
        timeouts.delete(id);
      },
    } satisfies HostTimers,
    fireTimeouts(count: number) {
      for (let i = 0; i < count; i++) {
        const first = timeouts.keys().next().value as number | undefined;
        if (first === undefined) {
          break;
        }
        const callback = timeouts.get(first);
        timeouts.delete(first);
        callback?.();
      }
    },
    fireIntervals(count: number) {
      for (let i = 0; i < count; i++) {
        for (const callback of [...intervals.values()]) {
          callback();
        }
      }
    },
  };
}

function createSession() {
  const conn = createFakeConnection();
  const timers = createFakeTimers();
  const frames: Array<ReturnType<HostSession["getState"]> extends never ? never : unknown> = [];
  const session = new HostSession({
    conn,
    onFrame: (frame) => frames.push(frame),
    timers: timers.handle,
    tickMs: 1,
    countdownMs: 1,
    createEngine: () =>
      createTestGame({
        random: () => 0.99,
        initialState: { status: "WAITING", fruits: SAFE_FRUITS },
      }),
  });
  return { conn, timers, frames, session };
}

function toPlaying(session: HostSession, timers: ReturnType<typeof createFakeTimers>) {
  session.start();
  timers.fireTimeouts(4);
}

function lastStateMessage(sent: unknown[]): { players: { p2: { snake: Array<{ x: number; y: number }>; score: number; alive: boolean } } } {
  const states = sent.filter((message): message is { type: "state"; players: { p2: { snake: Array<{ x: number; y: number }>; score: number; alive: boolean } } } =>
    (message as { type?: string }).type === "state",
  );
  return states[states.length - 1];
}

describe("HostSession countdown", () => {
  it("runs 3, 2, 1, 0 then switches to PLAYING and starts ticking", () => {
    const { conn, timers, session } = createSession();
    session.start();
    expect(conn.sent.filter((m) => (m as { type?: string }).type === "countdown").map((m) => (m as { value: number }).value)).toEqual([3]);
    timers.fireTimeouts(4);
    expect(conn.sent.filter((m) => (m as { type?: string }).type === "countdown").map((m) => (m as { value: number }).value)).toEqual([3, 2, 1, 0]);
    expect(session.getState().status).toBe("PLAYING");
    timers.fireIntervals(1);
    expect(session.getState().tick).toBe(1);
  });
});

describe("HostSession guest input", () => {
  it("applies guest input as p2 and broadcasts the updated state", () => {
    const { conn, timers, session } = createSession();
    toPlaying(session, timers);
    const result = session.handleRaw({ type: "input", direction: "UP" });
    expect(result.accepted).toBe(true);
    timers.fireIntervals(1);
    const state = session.getState();
    expect(state.players.p2.snake[0]).toEqual({ x: 34, y: 11 });
    expect(lastStateMessage(conn.sent).players.p2.snake[0]).toEqual({ x: 34, y: 11 });
    expect(state.players.p1.snake[0]).toEqual({ x: 6, y: 12 });
  });

  it("rejects an invalid message and replies with a protocol error", () => {
    const { conn, timers, session } = createSession();
    toPlaying(session, timers);
    const result = session.handleRaw({ type: "explode" });
    expect(result.accepted).toBe(false);
    const last = conn.sent[conn.sent.length - 1] as { type: string; code: string; message: string };
    expect(last.type).toBe("error");
    expect(last.code).toBe("INVALID_MESSAGE");
  });
});

describe("HostSession lifecycle", () => {
  it("accepts a restart request once finished and starts a fresh countdown", () => {
    const { timers, session } = createSession();
    toPlaying(session, timers);
    timers.fireIntervals(15);
    expect(session.getState().status).toBe("FINISHED");
    expect(session.getState().result).toBe("draw");
    const result = session.handleRaw({ type: "restart" });
    expect(result.accepted).toBe(true);
    expect(session.getState().status).toBe("COUNTDOWN");
    expect(session.getState().tick).toBe(0);
  });

  it("does not tick after stop()", () => {
    const { timers, session } = createSession();
    toPlaying(session, timers);
    session.stop();
    const tick = session.getState().tick;
    timers.fireIntervals(5);
    expect(session.getState().tick).toBe(tick);
  });
});