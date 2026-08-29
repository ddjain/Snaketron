# Snake Hunt

Two-player Snake with a hunt mechanic: eat fruit to grow, wrap around the board, and attack the other snake’s tail. The last surviving player wins.

This is a small desktop web game. There is no application backend. The host browser runs the game rules; the guest browser sends direction intent over a PeerJS WebRTC data connection.

## Architecture

```text
PeerJS signaling (peer identity + connection setup)
        │
        ▼
Player 1 (HOST)  ←—— WebRTC DataChannel ——→  Player 2 (GUEST)
   GameEngine
   movement, fruit, collisions, score, winner
```

- **PeerJS** assigns peer IDs and helps establish a WebRTC data channel.
- **Host authority:** Player 1 simulates every tick (150 ms), validates input, and broadcasts state.
- **Guest:** sends `{ type: "input", direction }` only, then renders the latest host state.
- A malicious host could fake state. That is accepted for this casual MVP.

### Game codes

The UI shows a 5-character code such as `X7K92` (letters `A–Z` except `I`/`O`, digits `2–9`).

The host PeerJS ID is `snakehunt-{CODE}` so short codes stay valid PeerJS IDs and are less likely to collide on the public broker. The join form accepts the short code and prefixes it internally.

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## Test

```bash
npm test
```

Game rules run in Vitest with injected fruit positions and RNG. Protocol tests use parsed JSON, not a live WebRTC connection.

## Build

```bash
npm run build
npm run preview
```

The production build is a static frontend. PeerJS still uses the public PeerJS cloud signaling server unless you later point the `Peer` constructor at your own PeerServer.

## How to play

1. Player 1 clicks **Create game** and shares the code.
2. Player 2 enters the code and clicks **Join game** (or scans the QR shown in the host lobby to join directly).
3. After the PeerJS connection opens, the host runs **3…2…1…GO!**.
4. **Player 1 (host):** `W` `A` `S` `D`. **Player 2 (guest):** arrow keys.
5. Eat fruit (`+1` score, grow by 1). Board edges wrap.
6. Hitting your own body or the opponent’s **non-tail** body kills you.
7. Moving your head onto the opponent’s **current tail** (start of tick) is a tail attack: steal up to 2 segments (`+2` score each). The opponent always keeps at least 2 segments. You do not die.
8. Heads meeting in the same cell, or swapping cells, is a **draw**.
9. Survival decides the winner, not score. **Play again** resets the same peer session.

## Limitations

- Peer-to-peer WebRTC is not guaranteed on every network (symmetric NAT, strict firewalls). The client ships with Google STUN plus the Open Relay public TURN relay so the guest's input can usually traverse NAT. For reliable play anywhere, override with your own TURN credentials (`VITE_PEERJS_TURN_URL`, `VITE_PEERJS_TURN_USERNAME`, `VITE_PEERJS_TURN_PASSWORD` at build time).
- If the **host** disconnects, the game ends. There is no host migration or reconnection.
- If the **guest** disconnects during play, the host wins by disconnect.
- Only two players. A third join is rejected (`GAME_FULL`).
- The host is trusted. There is no anti-cheat.

## Manual two-browser check

1. `npm run dev`
2. Tab A: Create game, copy the code.
3. Tab B (or another window/browser): Join with that code.
4. Confirm countdown, both snakes move, fruit matches on both screens, a tail attack or collision ends the game the same way on both sides, Play again works, then close one tab and confirm disconnect copy.

Use two machines on the same network if you can; some networks still fail without TURN.
