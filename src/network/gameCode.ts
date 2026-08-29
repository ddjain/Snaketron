import { CODE_ALPHABET, GAME_CODE_LENGTH, PEER_ID_PREFIX } from "../game/constants.ts";

export function generateGameCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < GAME_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeGameCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidGameCode(code: string): boolean {
  if (code.length !== GAME_CODE_LENGTH) {
    return false;
  }
  for (const char of code) {
    if (!CODE_ALPHABET.includes(char)) {
      return false;
    }
  }
  return true;
}

export function peerIdFromCode(code: string): string {
  return `${PEER_ID_PREFIX}${normalizeGameCode(code)}`;
}

export function codeFromPeerId(peerId: string): string | null {
  if (!peerId.startsWith(PEER_ID_PREFIX)) {
    return null;
  }
  return peerId.slice(PEER_ID_PREFIX.length);
}
