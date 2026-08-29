type HomeProps = {
  joinInput: string;
  error: string | null;
  onJoinInput: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
};

export function Home({ joinInput, error, onJoinInput, onCreate, onJoin }: HomeProps) {
  return (
    <main className="panel home">
      <p className="eyebrow">Peer-to-peer arcade</p>
      <h1>SNAKE HUNT</h1>
      <p className="tagline">Classic Snake. Now hunt the other snake.</p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="btn primary" onClick={onCreate}>
        Create game
      </button>
      <p className="or">OR</p>
      <form
        className="join-form"
        onSubmit={(event) => {
          event.preventDefault();
          onJoin();
        }}
      >
        <label htmlFor="game-code">Enter game code</label>
        <input
          id="game-code"
          name="game-code"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          value={joinInput}
          onChange={(event) => onJoinInput(event.target.value)}
          placeholder="X7K92"
        />
        <button type="submit" className="btn">
          Join game
        </button>
      </form>
    </main>
  );
}
