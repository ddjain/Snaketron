import { MAX_MESSAGE_BYTES } from "../game/constants.ts";
import type { GuestToHostMessage } from "./protocol.ts";
import { isDirection } from "./protocol.ts";

export type ParseResult =
  | { ok: true; message: GuestToHostMessage }
  | { ok: false; code: "INVALID_MESSAGE"; message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function parseGuestMessage(raw: unknown): ParseResult {
  let data: unknown = raw;

  if (typeof raw === "string") {
    if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
      return { ok: false, code: "INVALID_MESSAGE", message: "Message too large." };
    }
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, code: "INVALID_MESSAGE", message: "Malformed JSON." };
    }
  } else if (raw && typeof raw === "object") {
    try {
      const encoded = new TextEncoder().encode(JSON.stringify(raw));
      if (encoded.length > MAX_MESSAGE_BYTES) {
        return { ok: false, code: "INVALID_MESSAGE", message: "Message too large." };
      }
    } catch {
      return { ok: false, code: "INVALID_MESSAGE", message: "Invalid message." };
    }
  } else {
    return { ok: false, code: "INVALID_MESSAGE", message: "Invalid message." };
  }

  const record = asRecord(data);
  if (!record || typeof record.type !== "string") {
    return { ok: false, code: "INVALID_MESSAGE", message: "Invalid message." };
  }

  if (record.type === "input") {
    if (!isDirection(record.direction)) {
      return { ok: false, code: "INVALID_MESSAGE", message: "Invalid direction." };
    }
    return { ok: true, message: { type: "input", direction: record.direction } };
  }

  if (record.type === "restart") {
    return { ok: true, message: { type: "restart" } };
  }

  return { ok: false, code: "INVALID_MESSAGE", message: "Unknown message type." };
}

export function parseHostMessage(raw: unknown): Record<string, unknown> | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
      return null;
    }
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const record = asRecord(data);
  if (!record || typeof record.type !== "string") {
    return null;
  }
  return record;
}
