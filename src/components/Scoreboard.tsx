import type { GameState } from "../game/types.ts";

type ScoreboardProps = {
  gameState: GameState;
};

export function Scoreboard({ gameState }: ScoreboardProps) {
  return (
    <div className="scoreboard">
      <div className="score p1">
        <span>Player 1</span>
        <strong>{gameState.players.p1.score}</strong>
        {!gameState.players.p1.alive ? <em>Eliminated</em> : null}
      </div>
      <div className="score p2">
        <span>Player 2</span>
        <strong>{gameState.players.p2.score}</strong>
        {!gameState.players.p2.alive ? <em>Eliminated</em> : null}
      </div>
    </div>
  );
}
