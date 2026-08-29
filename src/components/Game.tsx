import { useEffect, useRef } from "react";
import { COLS, ROWS } from "../game/constants.ts";
import type { Direction, GameResult, GameState } from "../game/types.ts";
import { renderGame, sizeCanvas } from "../rendering/canvasRenderer.ts";
import type { Role } from "../session/useGameSession.ts";
import { GameOver } from "./GameOver.tsx";
import { Scoreboard } from "./Scoreboard.tsx";

type GameProps = {
  gameState: GameState;
  role: Role;
  screen: "countdown" | "playing" | "gameover";
  countdown: number | null;
  result: GameResult | null;
  disconnectNote: string | null;
  connectionStatus: string;
  hintDirection: Direction | null;
  onSteer: (direction: Direction) => void;
  onPlayAgain: () => void;
  onHome: () => void;
};

const DIRECTION_GLYPH: Record<Direction, string> = {
  UP: "▲",
  DOWN: "▼",
  LEFT: "◀",
  RIGHT: "▶",
};

export function Game({
  gameState,
  role,
  screen,
  countdown,
  result,
  disconnectNote,
  connectionStatus,
  hintDirection,
  onSteer,
  onPlayAgain,
  onHome,
}: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }

    const draw = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (width === 0 || height === 0) {
        return;
      }
      sizeCanvas(canvas, width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      renderGame(ctx, gameState, width, height);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [gameState]);

  return (
    <main className="game-screen">
      <header className="game-header">
        <h1>SNAKE HUNT</h1>
        <p className="status" role="status" aria-live="polite">
          {connectionStatus}
          {hintDirection ? ` · last input ${DIRECTION_GLYPH[hintDirection]}` : ""}
        </p>
      </header>
      <Scoreboard gameState={gameState} />
      <div className="board-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Game board ${COLS} by ${ROWS}. Player 1 is green. Player 2 is blue.`}
        />
        {screen === "countdown" ? (
          <div className="overlay countdown" aria-live="assertive">
            <p className="eyebrow">Get ready</p>
            <p className="count">{countdown === 0 ? "GO!" : countdown}</p>
          </div>
        ) : null}
        {screen === "gameover" ? (
          <GameOver
            result={result ?? gameState.result}
            p1Score={gameState.players.p1.score}
            p2Score={gameState.players.p2.score}
            disconnectNote={disconnectNote}
            onPlayAgain={onPlayAgain}
            onHome={onHome}
          />
        ) : null}
      </div>
      <p className="controls" aria-label="Keyboard controls">
        {role === "host"
          ? "You are Player 1. Steer with W A S D or the buttons below."
          : "You are Player 2. Steer with arrow keys or the buttons below."}
      </p>
      <p className="legend">
        Green snake: Player 1 (WASD). Blue snake: Player 2 (arrows). Eat fruit to grow.
        Hit the opponent tail to hunt. Avoid bodies. Last snake alive wins.
      </p>
      <div className="dpad" aria-label="Touch controls" role="group">
        <button
          type="button"
          className="dpad-btn up"
          aria-label="Steer up"
          onClick={() => onSteer("UP")}
        >
          ▲
        </button>
        <div className="dpad-row">
          <button
            type="button"
            className="dpad-btn left"
            aria-label="Steer left"
            onClick={() => onSteer("LEFT")}
          >
            ◀
          </button>
          <span className="dpad-center" aria-hidden="true"></span>
          <button
            type="button"
            className="dpad-btn right"
            aria-label="Steer right"
            onClick={() => onSteer("RIGHT")}
          >
            ▶
          </button>
        </div>
        <button
          type="button"
          className="dpad-btn down"
          aria-label="Steer down"
          onClick={() => onSteer("DOWN")}
        >
          ▼
        </button>
      </div>
    </main>
  );
}
