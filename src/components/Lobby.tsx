type LobbyProps = {
  code: string;
  status: string;
  isHost: boolean;
  onHome: () => void;
};

export function Lobby({ code, status, isHost, onHome }: LobbyProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard is optional for MVP.
    }
  };

  return (
    <main className="panel lobby">
      <h1>SNAKE HUNT</h1>
      {isHost ? (
        <>
          <p className="eyebrow">Your game code</p>
          <p className="code" aria-label={`Game code ${code}`}>
            {code}
          </p>
          <p>Share this code with Player 2.</p>
          {navigator.clipboard ? (
            <button type="button" className="btn" onClick={() => void copy()}>
              Copy code
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className="eyebrow">Game code</p>
          <p className="code">{code}</p>
          <p>Connected! Waiting for game...</p>
        </>
      )}
      <p className="status" role="status" aria-live="polite">
        {status}
      </p>
      <button type="button" className="btn ghost" onClick={onHome}>
        Home
      </button>
    </main>
  );
}
