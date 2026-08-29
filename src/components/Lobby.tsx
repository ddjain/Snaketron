import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { joinUrlFromPageUrl } from "../network/joinLink.ts";

type LobbyProps = {
  code: string;
  status: string;
  isHost: boolean;
  onHome: () => void;
};

export function Lobby({ code, status, isHost, onHome }: LobbyProps) {
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    if (!isHost || !code) {
      return;
    }
    let cancelled = false;
    const target = joinUrlFromPageUrl(window.location.href, code);
    QRCode.toDataURL(target, { width: 240, margin: 1 })
      .then((src) => {
        if (!cancelled) {
          setQrSrc(src);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrSrc("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, isHost]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard is optional for MVP.
    }
  };

  return (
    <main className="panel lobby">
      <h1>SNAKE HUNT</h1>
      {isHost ? (
        <>
          <p className="eyebrow">Your game code</p>
          <p className="code" aria-label={`Game code ${code}`}>
            {code}
          </p>
          {qrSrc ? (
            <>
              <img
                className="qr"
                src={qrSrc}
                alt={`QR code to join game ${code}`}
                width={180}
                height={180}
              />
              <p className="eyebrow">Scan with a second device</p>
            </>
          ) : null}
          <p>Share this code with Player 2.</p>
          {navigator.clipboard ? (
            <button type="button" className="btn" onClick={() => void copy()}>
              Copy code
            </button>
          ) : null}
        </>
      ) : (
        <>
          <p className="eyebrow">Game code</p>
          <p className="code">{code}</p>
          <p>Connected! Waiting for game...</p>
        </>
      )}
      <p className="status" role="status" aria-live="polite">
        {status}
      </p>
      <button type="button" className="btn ghost" onClick={onHome}>
        Home
      </button>
    </main>
  );
}