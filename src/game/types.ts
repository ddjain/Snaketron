export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export type PlayerId = "p1" | "p2";

export type GameStatus = "WAITING" | "COUNTDOWN" | "PLAYING" | "FINISHED";

export type GameResult = "p1_wins" | "p2_wins" | "draw";

export type Point = {
  x: number;
  y: number;
};

export type PlayerState = {
  id: PlayerId;
  direction: Direction;
  nextDirection: Direction;
  snake: Point[];
  alive: boolean;
  score: number;
  growthPending: number;
};

export type Fruit = {
  id: string;
  x: number;
  y: number;
};

export type GameState = {
  tick: number;
  status: GameStatus;
  players: {
    p1: PlayerState;
    p2: PlayerState;
  };
  fruits: Fruit[];
  result: GameResult | null;
};

export type GameConfig = {
  random?: () => number;
  randomizePlayers?: boolean;
  fruitId?: () => string;
  initialState?: {
    tick?: number;
    status?: GameStatus;
    fruits?: Fruit[];
    result?: GameResult | null;
    players?: {
      p1?: Partial<PlayerState>;
      p2?: Partial<PlayerState>;
    };
  };
};
