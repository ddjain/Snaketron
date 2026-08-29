import { Peer, type DataConnection, type PeerOptions } from "peerjs";

const brokerHost = import.meta.env.VITE_PEERJS_HOST as string | undefined;
const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls:
      (import.meta.env.VITE_PEERJS_TURN_URL as string | undefined) ??
      "turn:openrelay.metered.ca:80",
    username: (import.meta.env.VITE_PEERJS_TURN_USERNAME as string | undefined) ?? "openrelayproject",
    credential: (import.meta.env.VITE_PEERJS_TURN_PASSWORD as string | undefined) ?? "openrelayproject",
  },
];
const peerOptions: PeerOptions = brokerHost
  ? {
      host: brokerHost,
      port: Number(import.meta.env.VITE_PEERJS_PORT ?? 443),
      path: (import.meta.env.VITE_PEERJS_PATH as string | undefined) ?? "/",
      secure: (import.meta.env.VITE_PEERJS_SECURE as string | undefined) !== "false",
      config: { iceServers },
    }
  : { config: { iceServers } };

export function createHostPeer(peerId: string): Peer {
  return new Peer(peerId, peerOptions);
}

export function createGuestPeer(): Peer {
  return new Peer(peerOptions);
}

export function destroyPeer(peer: Peer | null): void {
  if (!peer) {
    return;
  }
  try {
    peer.destroy();
  } catch {
    // PeerJS may throw if already destroyed.
  }
}

export function isUnavailableId(error: { type?: string }): boolean {
  return error.type === "unavailable-id";
}

export function isPeerUnavailable(error: { type?: string }): boolean {
  return error.type === "peer-unavailable";
}

export type { DataConnection, Peer };
