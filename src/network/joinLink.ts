import { isValidGameCode, normalizeGameCode } from "./gameCode.ts";

export function joinUrlFromPageUrl(pageUrl: string, code: string): string {
  const url = new URL(pageUrl);
  url.searchParams.set("code", normalizeGameCode(code));
  return url.toString();
}

export function joinCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get("code");
  if (!raw) {
    return null;
  }
  const code = normalizeGameCode(raw.toUpperCase());
  return isValidGameCode(code) ? code : null;
}