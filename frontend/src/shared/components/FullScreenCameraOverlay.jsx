import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Overlay de cámara a pantalla completa con opción de subir imagen desde archivos.
 * Al capturar o seleccionar una imagen llama a onCapture(dataUrl, mimeType) y se cierra.
 */
export default function FullScreenCameraOverlay({
  isOpen,
  onCapture,
  onClose,
  facingMode = "environment",
}) {
  const [cameraError, setCameraError] = useState("");
  const [streamReady, setStreamReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamReady(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraError("");
      return;
    }

    let cancelled = false;
    const start = async () => {
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Tu navegador no permite acceder a la cámara. Puedes subir una foto.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStreamReady(true);
      } catch {
        if (!cancelled) {
          setCameraError("No pudimos acceder a tu cámara. Puedes subir una foto desde tus archivos.");
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    if (isOpen && streamReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, streamReady]);

  if (!isOpen) return null;

  const handleCapture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !streamReady) return;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    stopCamera();
    onCapture?.(dataUrl, "image/jpeg");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCameraError("Por favor selecciona una imagen válida (JPG, PNG, WEBP).");
      return;
    }
    const mime = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = (ev) => {
      stopCamera();
      onCapture?.(ev.target?.result, mime);
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  const btnBase = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    borderRadius: "50%",
  };

  return createPortal(
    <div
      role="dialog"
      aria-label="Cámara"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 99999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {cameraError && (
        <div
          role="alert"
          style={{
            position: "relative",
            zIndex: 10,
            margin: "0 24px 16px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(249, 236, 232, 0.95)",
            color: "#9A5A43",
            fontSize: "13px",
            textAlign: "center",
            maxWidth: "360px",
          }}
        >
          {cameraError}
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          padding: "32px 24px 48px",
          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Subir desde archivos"
          style={{
            ...btnBase,
            width: "48px",
            height: "48px",
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleCapture}
          disabled={!streamReady}
          aria-label="Capturar foto"
          style={{
            ...btnBase,
            width: "72px",
            height: "72px",
            background: "#fff",
            color: "#163B35",
            border: "4px solid rgba(255,255,255,0.4)",
            opacity: streamReady ? 1 : 0.45,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M20.94 11A8.994 8.994 0 0 0 3.06 11" />
            <path d="M3.06 13A8.994 8.994 0 0 0 20.94 13" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Cancelar"
          style={{
            ...btnBase,
            width: "48px",
            height: "48px",
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>,
    document.body
  );
}

