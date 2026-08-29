import { COLS, ROWS } from "../game/constants.ts";
import type { GameState } from "../game/types.ts";

const BG = "#070b14";
const GRID = "#152038";
const P1 = "#3dff8a";
const P1_HEAD = "#b6ffd4";
const P2 = "#4da3ff";
const P2_HEAD = "#c6e2ff";
const FRUIT = "#ff5c7a";
const FRUIT_CORE = "#ffd1da";

export function sizeCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number): void {
  const cellW = width / COLS;
  const cellH = height / ROWS;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x++) {
    ctx.moveTo(x * cellW, 0);
    ctx.lineTo(x * cellW, height);
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.moveTo(0, y * cellH);
    ctx.lineTo(width, y * cellH);
  }
  ctx.stroke();

  for (const fruit of state.fruits) {
    const cx = fruit.x * cellW + cellW / 2;
    const cy = fruit.y * cellH + cellH / 2;
    ctx.fillStyle = FRUIT;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cellW, cellH) * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FRUIT_CORE;
    ctx.beginPath();
    ctx.arc(cx - cellW * 0.08, cy - cellH * 0.08, Math.min(cellW, cellH) * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSnake(ctx, state.players.p1.snake, cellW, cellH, P1, P1_HEAD);
  drawSnake(ctx, state.players.p2.snake, cellW, cellH, P2, P2_HEAD);
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: GameState["players"]["p1"]["snake"],
  cellW: number,
  cellH: number,
  color: string,
  headColor: string,
): void {
  const pad = Math.min(cellW, cellH) * 0.12;
  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? headColor : color;
    ctx.fillRect(segment.x * cellW + pad, segment.y * cellH + pad, cellW - pad * 2, cellH - pad * 2);
  });
}
