export const COLS = 25;
export const ROWS = 40;
export const TICK_MS = 150;
export const INITIAL_SNAKE_LENGTH = 3;
export const MIN_SNAKE_LENGTH = 2;
export const FRUIT_COUNT = 2;
export const MAX_TAIL_CONSUME = 2;
export const FRUIT_SCORE = 1;
export const TAIL_SEGMENT_SCORE = 2;
export const MAX_FRUIT_SPAWN_RETRIES = 200;

export const P1_START = {
  snake: [
    { x: 5, y: 20 },
    { x: 4, y: 20 },
    { x: 3, y: 20 },
  ],
  direction: "RIGHT" as const,
};

export const P2_START = {
  snake: [
    { x: 19, y: 20 },
    { x: 20, y: 20 },
    { x: 21, y: 20 },
  ],
  direction: "LEFT" as const,
};

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GAME_CODE_LENGTH = 5;
export const PEER_ID_PREFIX = "snakehunt-";
export const MAX_MESSAGE_BYTES = 16_384;
