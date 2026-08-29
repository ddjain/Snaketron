# Snake Hunt — TDD Plan

Implementation follows **Test-Driven Development (TDD)** per requirement 72 (this project is "built already" and now in a TDD close-the-gaps + refactor phase).

## Current state (audit)

Green suite: `npm test` → 39 tests passing (2 files: `gameEngine.test.ts`, `validation.test.ts`). Core engine rules are implemented but only partially tested.

### Tested

- Movement, direction validation (opposite rejection, perpendicular turn), 4-edge wrapping
- Fruit eat/spawn (+1 score, grow 1), replacement never overlaps a snake
- Self collision (kill on body, no kill on vacating tail cell)
- Opponent-body collision, tail attacks (max 2 consumed, min length 2 preserved)
- Head-on and head-swap → draw
- Win/loss/draw results; no tick after finish
- Wrap-onto-body collision is fatal
- No fruit score awarded when both players die on the same cell
- Simultaneous tail attacks keep both players alive
- Network: guest message validation, host incoming handlers, game codes

### Injectable / controllable (good, matches §72.5)

- RNG via `config.random`
- Fruit IDs via `config.fruitId`
- Initial state / fruit positions via `config.initialState`

### Gaps

- Several required edge cases untested (see Phase 1)
- `serialize.ts` untested
- Host↔guest message flow has no fake-connection test (§72.6)
- UI/rendering has no tests
- `useGameSession.ts` owns untestable host-session logic (extraction needed)

## Workflow (per feature)

```text
Requirement
    ↓
Define expected behavior
    ↓
Write test            (RED)
    ↓
Run test → FAIL
    ↓
Implement minimum solution (GREEN)
    ↓
Run test → PASS
    ↓
Refactor (improve without changing behavior)
    ↓
Run complete suite
```

After every step run:

```bash
npm test
npm run lint
npm run build
```

Never proceed while the suite is red (§72.8).

## Phase 1 — Close game-rule coverage gaps

Each test goes in `src/game/gameEngine.test.ts` first, confirmed FAIL, then implementation only if the behavior is missing.

1. Fruit at collision positions (§72.4): fruit on a tail-attack cell → attacker eats tail but not the fruit (define behavior in test first); fruit on a cell where the attacker dies on opponent body → no score.
2. Both players die the same tick via simultaneous self-collision → draw (§72.4).
3. Both players reach the same tail → heads meet at that cell → draw, not simultaneous tail attack (define expected behavior first).
4. Head collision ordered before tail attack: attacker head reaches the opponent head sitting on its own tail cell → draw.
5. Tail is moving away — explicit opponent case mirroring the existing self "vacating tail" test (§72.4).
6. Growth-pending interaction: self-collision scan against a growing snake's full body (`effectiveBody`); tail attack vs. a growing victim (longer snake → more segments stealable).
7. Input rules: `setInput` ignored when the player is dead, when status is `FINISHED`, and after a draw result.
8. Score accumulation across multiple ticks (fruit + tail attacks).
9. Wrapping tail attack: attacker wraps and lands on opponent tail.
10. Determinism: two engines with identical injected RNG sequence + fruit positions produce identical states across N ticks (§72.5).

## Phase 2 — Network integration (fake connection, §72.6)

11. New `src/network/serialize.test.ts`: `toStateMessage` shape, `toGameOverMessage` null-when-active / result-when-finished, `gameStateFromNetwork` round-trip.
12. Extract a testable host-session module (e.g. `src/network/hostSession.ts`) that owns engine + connection so the loop "guest input → host applies → state broadcast" is testable. Currently the flow lives in the `useGameSession.ts` React hook.
    - RED: `createFakeConnection()` capturing `.send()`, drive `handleHostIncoming`, assert engine state + outbound `state` messages; then implement the extraction.
    - Move countdown/restart lifecycle into the module too so it is unit-testable.
    - `useGameSession.ts` becomes a thin wrapper over the module.

## Phase 3 — UI / rendering (where practical)

13. Canvas smoke test: stub `CanvasRenderingContext2D`, assert `renderGame` draws without throwing and paints expected cells/colors.
14. Component tests for `Game`, `Lobby`, `GameOver`, `Scoreboard` only if a renderer/testing library is added deliberately; otherwise covered by manual E2E (§72.7).

## Phase 4 — E2E / manual (§72.8)

15. Use the existing "Manual two-browser check" in `README.md` as the recorded checklist; run it before declaring §72 complete.

## Definition of TDD completion (§72.8)

- [ ] Expected behavior has a test.
- [ ] Test was observed failing before implementation where practical.
- [ ] Minimal implementation makes the test pass.
- [ ] Existing tests continue to pass.
- [ ] Edge cases are covered.
- [ ] Regression tests are added for discovered bugs.
- [ ] No game rule exists only as untested implementation logic.

## Progress log

Suite: `96 tests / 12 files`, `npm run lint` and `npm run build` clean.

- **Phase 1 — done.** Added 10 game-rule tests (`src/game/gameEngine.test.ts`): fruit-on-tail-cell (attack + fruit both awarded), fruit-on-death-cell (no score), simultaneous self-collisions → draw, both heads on the same tail cell → draw with head-collision precedence, opponent tail moving away, growth-pending self-collision, input ignored for dead/FINISHED, score accumulation, wrapping tail attack, determinism. One RED surfaced a test-authoring bug (spawner reuses fruit id `f1`); fixed by asserting position, not id.
- **Phase 2 — done.** `src/network/serialize.test.ts`: state message shape, round-trip, game-over message. Extracted the host game loop into `src/network/hostSession.ts` (HostSession: engine + connection + countdown + tick + input/restart handling, injectable timers/engine factory); protocol tests drive it with a fake connection and fake timers. `useGameSession.ts` rewired onto HostSession; `toStateMessage` now returns the narrowed `StateMessage` type.
- **Phase 3 — done.** `src/rendering/canvasRenderer.test.ts` smoke tests with a stubbed 2D context. React component tests added too (`@testing-library/react` + `@testing-library/jest-dom` + `user-event` + `jsdom`, cleanup + `ResizeObserver` stub in `src/test/setup.ts`): `Home`, `Lobby` (incl. clipboard copy), `GameOver`, `Scoreboard`, `Game` (countdown/GO!, host vs guest controls, game-over dialog). Note: `user-event` would not dispatch the Lobby copy button's async handler in this jsdom setup, so `fireEvent.click` is used there. Vitest now runs in the `jsdom` environment and includes `*.test.tsx`.
- **Phase 2 follow-up — done.** Extracted the guest message → view transitions into pure `src/network/guestProtocol.ts` (`applyHostPayload`) with 9 fake-message tests (connected, countdown, state/COUNTDOWN, game_over with scores, errors incl. `GAME_FULL`, malformed/unknown ignored). `useGameSession` guest path + App-level smoke (`src/App.test.tsx`) rewired onto it; a `viewRef` keeps the latest state for atomic transitions.
- **Phase 4 — NOT run.** Manual two-browser check in `README.md` still required before declaring §72 complete.