import type { GameResult } from "../game/types.ts";

type GameOverProps = {
  result: GameResult | null;
  p1Score: number;
  p2Score: number;
  disconnectNote: string | null;
  onPlayAgain: () => void;
  onHome: () => void;
};

export function GameOver({
  result,
  p1Score,
  p2Score,
  disconnectNote,
  onPlayAgain,
  onHome,
}: GameOverProps) {
  const title = disconnectNote
    ? disconnectNote
    : result === "draw"
      ? "DRAW!"
      : result === "p1_wins"
        ? "PLAYER 1 WINS!"
        : result === "p2_wins"
          ? "PLAYER 2 WINS!"
          : "Game over";

  const detail =
    result === "draw" && !disconnectNote ? "Both snakes were eliminated." : null;

  return (
    <div className="overlay" role="dialog" aria-labelledby="gameover-title">
      <div className="overlay-card">
        <h2 id="gameover-title">{title}</h2>
        {detail ? <p>{detail}</p> : null}
        <p className="final-scores">
          Player 1 <strong>{p1Score}</strong>
          <span aria-hidden="true"> · </span>
          Player 2 <strong>{p2Score}</strong>
        </p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" className="btn" onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
