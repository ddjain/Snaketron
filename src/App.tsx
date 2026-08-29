import { Game } from "./components/Game.tsx";
import { Home } from "./components/Home.tsx";
import { Lobby } from "./components/Lobby.tsx";
import { useGameSession } from "./session/useGameSession.ts";

export default function App() {
  const { state, createGame, joinGame, goHome, playAgain, setJoinInput } = useGameSession();

  if (state.screen === "home") {
    return (
      <Home
        joinInput={state.joinInput}
        error={state.error}
        onJoinInput={setJoinInput}
        onCreate={createGame}
        onJoin={joinGame}
      />
    );
  }

  if (state.screen === "gameover" && state.role && !state.gameState) {
    return (
      <main className="panel lobby">
        <h1>SNAKE HUNT</h1>
        <p className="error" role="alert">
          {state.disconnectNote ?? "Game ended."}
        </p>
        <button type="button" className="btn primary" onClick={goHome}>
          Home
        </button>
      </main>
    );
  }

  if (state.screen === "lobby" || !state.gameState || !state.role) {
    return (
      <Lobby
        code={state.code}
        status={state.connectionStatus}
        isHost={state.role === "host"}
        onHome={goHome}
      />
    );
  }

  const gameScreen =
    state.screen === "countdown" || state.screen === "playing" || state.screen === "gameover"
      ? state.screen
      : "playing";

  return (
    <Game
      gameState={state.gameState}
      role={state.role}
      screen={gameScreen}
      countdown={state.countdown}
      result={state.result}
      disconnectNote={state.disconnectNote}
      connectionStatus={state.connectionStatus}
      onPlayAgain={playAgain}
      onHome={goHome}
    />
  );
}
