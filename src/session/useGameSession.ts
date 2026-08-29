import { useCallback, useEffect, useRef, useState } from "react";
import type { Direction, GameResult, GameState } from "../game/types.ts";
import {
  generateGameCode,
  isValidGameCode,
  normalizeGameCode,
  peerIdFromCode,
} from "../network/gameCode.ts";
import {
  HostSession,
  type HostConnection,
  type HostFrame,
} from "../network/hostSession.ts";
import {
  createGuestPeer,
  createHostPeer,
  destroyPeer,
  isPeerUnavailable,
  isUnavailableId,
  type DataConnection,
  type Peer,
} from "../network/peer.ts";
import { applyHostPayload } from "../network/guestProtocol.ts";
import type { ErrorCode } from "../network/protocol.ts";

export type Screen = "home" | "lobby" | "countdown" | "playing" | "gameover";
export type Role = "host" | "guest";

export type SessionState = {
  screen: Screen;
  role: Role | null;
  code: string;
  joinInput: string;
  connectionStatus: string;
  countdown: number | null;
  gameState: GameState | null;
  result: GameResult | null;
  error: string | null;
  errorCode: ErrorCode | null;
  disconnectNote: string | null;
  hintDirection: Direction | null;
};

const initial: SessionState = {
  screen: "home",
  role: null,
  code: "",
  joinInput: "",
  connectionStatus: "",
  countdown: null,
  gameState: null,
  result: null,
  error: null,
  errorCode: null,
  disconnectNote: null,
  hintDirection: null,
};

export function useGameSession() {
  const [state, setState] = useState<SessionState>(initial);
  const viewRef = useRef<SessionState>(initial);
  const sessionRef = useRef<HostSession | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const connectTimerRef = useRef<number | null>(null);
  const roleRef = useRef<Role | null>(null);
  const guestOccupiedRef = useRef(false);

  const patch = useCallback((partial: Partial<SessionState>) => {
    viewRef.current = { ...viewRef.current, ...partial };
    setState(viewRef.current);
  }, []);

  const clearTimers = useCallback(() => {
    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    sessionRef.current?.stop();
    sessionRef.current = null;
    guestOccupiedRef.current = false;
    connRef.current = null;
    destroyPeer(peerRef.current);
    peerRef.current = null;
    roleRef.current = null;
  }, [clearTimers]);

  const goHome = useCallback(() => {
    teardown();
    patch(initial);
  }, [patch, teardown]);

  const handleHostFrame = useCallback(
    (frame: HostFrame) => {
      if (frame.result) {
        patch({
          screen: "gameover",
          gameState: frame.gameState,
          result: frame.result,
          disconnectNote: null,
        });
        return;
      }
      if (frame.countdown !== null) {
        patch({
          screen: "countdown",
          countdown: frame.countdown,
          gameState: frame.gameState,
          result: null,
        });
        return;
      }
      patch({
        screen: "playing",
        countdown: null,
        gameState: frame.gameState,
        result: null,
      });
    },
    [patch],
  );

  const attachGuestConnection = useCallback(
    (conn: DataConnection) => {
      connRef.current = conn;
      guestOccupiedRef.current = true;

      conn.on("open", () => {
        conn.send({ type: "connected", playerId: "p2" });
        const session = new HostSession({ conn: conn as HostConnection, onFrame: handleHostFrame });
        sessionRef.current = session;
        patch({ connectionStatus: "Connected", screen: "countdown" });
        session.start();
      });

      conn.on("data", (raw) => {
        sessionRef.current?.handleRaw(raw);
      });

      conn.on("close", () => {
        guestOccupiedRef.current = false;
        connRef.current = null;
        const session = sessionRef.current;
        const status = session?.getState().status;
        if (status === "PLAYING" || status === "COUNTDOWN") {
          session?.stop();
          patch({
            screen: "gameover",
            result: "p1_wins",
            disconnectNote: "You win — opponent disconnected",
            connectionStatus: "Opponent disconnected",
            countdown: null,
            gameState: session?.getState() ?? null,
          });
          return;
        }
        patch({
          screen: "lobby",
          connectionStatus: "Opponent disconnected",
          countdown: null,
        });
      });

      conn.on("error", () => {
        patch({ connectionStatus: "Connection failed" });
      });
    },
    [handleHostFrame, patch],
  );

  const createGame = useCallback(() => {
    teardown();
    roleRef.current = "host";
    patch({
      role: "host",
      screen: "lobby",
      connectionStatus: "Connecting...",
      error: null,
      errorCode: null,
      joinInput: "",
    });

    const attemptCreate = (attempt: number) => {
      const code = generateGameCode();
      const peer = createHostPeer(peerIdFromCode(code));
      peerRef.current = peer;

      peer.on("open", () => {
        if (peerRef.current !== peer) {
          return;
        }
        patch({
          code,
          connectionStatus: "Waiting for opponent...",
          error: null,
        });
      });

      peer.on("connection", (conn) => {
        if (guestOccupiedRef.current) {
          conn.on("open", () => {
            conn.send({
              type: "error",
              code: "GAME_FULL",
              message: "Game already full.",
            });
            conn.close();
          });
          return;
        }
        attachGuestConnection(conn);
      });

      peer.on("error", (err) => {
        if (peerRef.current !== peer) {
          return;
        }
        if (isUnavailableId(err) && attempt < 5) {
          destroyPeer(peer);
          attemptCreate(attempt + 1);
          return;
        }
        patch({
          screen: "home",
          error: "Unable to create game.",
          errorCode: "UNABLE_TO_CONNECT",
          connectionStatus: "Connection failed",
        });
        teardown();
      });
    };

    attemptCreate(0);
  }, [attachGuestConnection, patch, teardown]);

  const handleHostPayload = useCallback(
    (raw: unknown) => {
      const { transition, teardown: shouldTeardown } = applyHostPayload(raw, viewRef.current);
      if (Object.keys(transition).length > 0) {
        patch(transition);
      }
      if (shouldTeardown) {
        teardown();
      }
    },
    [patch, teardown],
  );

  const joinGame = useCallback(() => {
    const code = normalizeGameCode(state.joinInput);
    if (!isValidGameCode(code)) {
      patch({ error: "Invalid game code.", errorCode: "INVALID_GAME_CODE" });
      return;
    }
    teardown();
    roleRef.current = "guest";
    patch({
      role: "guest",
      code,
      screen: "lobby",
      connectionStatus: "Connecting...",
      error: null,
      errorCode: null,
    });

    const peer = createGuestPeer();
    peerRef.current = peer;

    connectTimerRef.current = window.setTimeout(() => {
      patch({
        screen: "home",
        error: "Unable to connect.",
        errorCode: "UNABLE_TO_CONNECT",
        connectionStatus: "Connection failed",
      });
      teardown();
    }, 12000);

    peer.on("open", () => {
      const conn = peer.connect(peerIdFromCode(code), { reliable: true });
      connRef.current = conn;
      conn.on("open", () => {
        if (connectTimerRef.current !== null) {
          window.clearTimeout(connectTimerRef.current);
          connectTimerRef.current = null;
        }
        patch({ connectionStatus: "Connected", error: null });
      });
      conn.on("data", (raw) => handleHostPayload(raw));
      conn.on("close", () => {
        clearTimers();
        patch({
          screen: "gameover",
          disconnectNote: "Game ended. Host disconnected.",
          connectionStatus: "Connection lost",
          result: null,
        });
      });
      conn.on("error", () => {
        patch({
          screen: "home",
          error: "Unable to connect.",
          errorCode: "UNABLE_TO_CONNECT",
          connectionStatus: "Connection failed",
        });
        teardown();
      });
    });

    peer.on("error", (err) => {
      if (connectTimerRef.current !== null) {
        window.clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      const notFound = isPeerUnavailable(err);
      patch({
        screen: "home",
        error: notFound ? "Game not found." : "Unable to connect.",
        errorCode: notFound ? "GAME_NOT_FOUND" : "UNABLE_TO_CONNECT",
        connectionStatus: "Connection failed",
      });
      teardown();
    });
  }, [clearTimers, handleHostPayload, patch, state.joinInput, teardown]);

  const sendInput = useCallback(
    (direction: Direction) => {
      patch({ hintDirection: direction });
      if (roleRef.current === "host") {
        sessionRef.current?.dispatchHostInput(direction);
        return;
      }
      if (roleRef.current === "guest" && connRef.current?.open) {
        connRef.current.send({ type: "input", direction });
      }
    },
    [patch],
  );

  const playAgain = useCallback(() => {
    if (roleRef.current === "host") {
      sessionRef.current?.start();
      return;
    }
    if (connRef.current?.open) {
      connRef.current.send({ type: "restart" });
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const role = roleRef.current;
      if (!role) {
        return;
      }
      let direction: Direction | null = null;
      if (role === "host") {
        const key = event.key.toLowerCase();
        if (key === "w") direction = "UP";
        if (key === "a") direction = "LEFT";
        if (key === "s") direction = "DOWN";
        if (key === "d") direction = "RIGHT";
      } else {
        if (event.key === "ArrowUp") direction = "UP";
        if (event.key === "ArrowDown") direction = "DOWN";
        if (event.key === "ArrowLeft") direction = "LEFT";
        if (event.key === "ArrowRight") direction = "RIGHT";
      }
      if (!direction) {
        return;
      }
      event.preventDefault();
      sendInput(direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendInput]);

  useEffect(() => () => teardown(), [teardown]);

  const setJoinInput = useCallback((value: string) => {
    patch({ joinInput: value.toUpperCase() });
  }, [patch]);

  return {
    state,
    createGame,
    joinGame,
    goHome,
    playAgain,
    setJoinInput,
  };
}