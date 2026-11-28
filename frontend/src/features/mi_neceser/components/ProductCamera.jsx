import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

function cameraErrorMessage(error) {
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permite el acceso a la cámara en los permisos del sitio y en la configuración de privacidad de Windows. Después vuelve a intentar.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "El navegador no encontró una cámara disponible. Conecta o activa la cámara y vuelve a intentar.";
    case "NotReadableError":
    case "AbortError":
      return "La cámara no pudo iniciar. Cierra otras aplicaciones que la estén usando y vuelve a intentar.";
    default:
      return "No se pudo iniciar la cámara. Puedes intentar de nuevo o elegir una foto del dispositivo.";
  }
}

export default function ProductCamera({ label, onCapture, onClose, description, children, busy = false, uploadError }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  useEffect(() => {
    if (busy) return;
    const video = videoRef.current;
    let stream;
    let closed = false;

    async function startCamera() {
      if (closed) return;
      if (!window.isSecureContext) {
        setError("Abre Skinova en localhost si estás en la PC que ejecuta la app, o usa una dirección HTTPS para activar la cámara.");
        return;
      }
      const media = navigator.mediaDevices;
      if (!media?.getUserMedia) {
        setError("Este navegador no permite acceder a la cámara. Abre Skinova en Chrome o Edge actualizado.");
        return;
      }
      try {
        const preferRearCamera = window.matchMedia("(pointer: coarse)").matches;
        const defaultCamera = { video: true, audio: false };
        try {
          stream = await media.getUserMedia(preferRearCamera
            ? { video: { facingMode: { ideal: "environment" } }, audio: false }
            : defaultCamera);
        } catch (error) {
          if (!preferRearCamera || closed || !["NotFoundError", "OverconstrainedError"].includes(error.name)) throw error;
          stream = await media.getUserMedia(defaultCamera);
        }
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!closed) setError(cameraErrorMessage(error));
      }
    }

    // React's development setup and cleanup can run in the same turn.
    queueMicrotask(startCamera);
    return () => {
      closed = true;
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [attempt, busy]);

  function retryCamera() {
    setError("");
    setReady(false);
    setAttempt((current) => current + 1);
  }

  function takePhoto() {
    if (busy) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob && dialogRef.current?.open) {
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      }
    }, "image/jpeg", 0.9);
  }

  return (
    <dialog ref={dialogRef} className="neceser-detail-dialog neceser-camera"
      aria-labelledby="neceser-camera-title" aria-describedby={description ? "neceser-camera-description" : undefined}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="neceser-detail-content">
        <button type="button" className="neceser-detail-close" aria-label="Cerrar cámara"
          onClick={onClose} disabled={busy}>
          <X size={22} aria-hidden="true" />
        </button>
        <h2 id="neceser-camera-title">{label}</h2>
        {description && <p id="neceser-camera-description">{description}</p>}
        <video ref={videoRef} muted playsInline onPlaying={() => setReady(true)}
          onEmptied={() => setReady(false)} hidden={busy || Boolean(error)} />
        {busy && <p className="neceser-detail-status" role="status">Buscando y agregando el producto…</p>}
        {!busy && error && <p role="alert" className="neceser-error">{error}</p>}
        {!busy && !ready && !error && <p role="status">Abriendo la cámara…</p>}
        {uploadError && <p role="alert" className="neceser-error">{uploadError}</p>}
        <div className="neceser-detail-actions">
          {error ? <button type="button" onClick={retryCamera} disabled={busy}>Volver a intentar</button> :
            <button type="button" onClick={takePhoto} disabled={busy || !ready}>Tomar foto</button>}
          {children}
        </div>
      </div>
    </dialog>
  );
}
