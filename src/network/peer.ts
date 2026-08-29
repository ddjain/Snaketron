import { Peer, type DataConnection } from "peerjs";

export function createHostPeer(peerId: string): Peer {
  return new Peer(peerId);
}

export function createGuestPeer(): Peer {
  return new Peer();
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
