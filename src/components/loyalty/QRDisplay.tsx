"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  token: string;
  size?: number;
  label?: string;
}

/**
 * Renderiza el QR de la clienta en un <canvas>.
 * El contenido del QR es el token único — sin URL externa.
 */
export default function QRDisplay({ token, size = 200, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, token, {
      width: size,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    }).catch(console.error);
  }, [token, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-white rounded-2xl shadow-primary-sm">
        <canvas ref={canvasRef} />
      </div>
      {label && (
        <p className="text-xs font-mono text-on-surface-variant tracking-wider">{label}</p>
      )}
    </div>
  );
}
