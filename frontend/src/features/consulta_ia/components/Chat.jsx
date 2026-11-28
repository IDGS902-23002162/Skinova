import React, { useState, useRef, useEffect } from "react";
import { ChatRespuesta } from "./ChatRespuesta";
import { useIaService } from "../services/ia_service";
import "../styles/consulta_conversation_style.css";

const parseAnalysisData = (data) => {
  if (!data) return null;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
};

// Builds messages from a saved conversation — no hardcoded AI greeting
const createInitialMessages = (conversationData) => {
  if (!conversationData) return [];

  const analysis = parseAnalysisData(conversationData.analysis);
  const currentTime = conversationData.time ||
    new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  const userQuery = conversationData.query_text || conversationData.search_query ||
    conversationData.title || "Consulta de producto";

  const msgs = [{
    role: "user",
    content: userQuery,
    image: conversationData.image || null,
    time: currentTime
  }];

  if (analysis) {
    msgs.push({ role: "assistant", analysis, time: currentTime });
  } else if (conversationData.preview) {
    msgs.push({ role: "assistant", content: conversationData.preview, time: currentTime });
  }

  // Restore persisted follow-up chat turns
  if (Array.isArray(analysis?.chat_messages)) {
    for (const m of analysis.chat_messages) {
      if (m?.content) {
        msgs.push({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
          time: m.time || currentTime
        });
      }
    }
  }

  return msgs;
};

export default function Chat({
  conversationData = null,
  onNewConsultation = null,
  onChatMessageSaved = null,
  onSubmitAnalysis = null,   // called when no conversationData (empty state submit)
  isAnalyzing = false,
  submitError = "",
}) {
  const { sendChatMessage } = useIaService();
  const [messages, setMessages] = useState(() => createInitialMessages(conversationData));
  const [inputText, setInputText] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const textareaRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync messages when selected conversation changes
  useEffect(() => {
    setMessages(createInitialMessages(conversationData));
    setCapturedImage(null);
    setCameraError("");
  }, [conversationData?.id]);

  // Attach stream once the camera overlay <video> mounts
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Cleanup camera on unmount
  useEffect(() => () => stopCamera(), []);

  const now = () => new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
  };

  /* ── Camera ─────────────────────────────────── */
  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Tu navegador no permite acceder a la cámara.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setCameraError("No pudimos acceder a tu cámara. Puedes subir una foto desde tus archivos.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const v = videoRef.current; const c = canvasRef.current;
    if (v && c) {
      c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      setCapturedImage(c.toDataURL("image/jpeg", 0.9));
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setCameraError("Por favor selecciona una imagen válida."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setCapturedImage(ev.target?.result); stopCamera(); };
    reader.readAsDataURL(file);
  };

  /* ── Submit (empty state → analysis, or follow-up chat) ── */
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();

    // Empty state: trigger analysis
    if (!conversationData) {
      if (!text && !capturedImage) return;
      if (onSubmitAnalysis) {
        onSubmitAnalysis({ searchQuery: text, imageBase64: capturedImage });
        setInputText("");
        setCapturedImage(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      return;
    }

    // Follow-up chat
    if (!text || isReplying) return;
    const userTime = now();
    const userMsg = { role: "user", content: text, time: userTime };
    const priorMessages = messages;
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsReplying(true);

    const activeAnalysis = parseAnalysisData(conversationData?.analysis);
    try {
      const data = await sendChatMessage({
        historyId: conversationData?.id,
        message: text,
        productAnalysis: activeAnalysis,
        messages: priorMessages
      });
      const assistantMsg = { role: "assistant", content: data.reply, time: data.time || now() };
      setMessages(prev => [...prev, assistantMsg]);
      if (onChatMessageSaved && conversationData?.id) {
        onChatMessageSaved(conversationData.id, [userMsg, assistantMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: err.message || "No se pudo obtener respuesta de la IA. Intenta de nuevo.",
        time: now()
      }]);
    } finally {
      setIsReplying(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const isBusy = conversationData ? isReplying : isAnalyzing;
  const isDisabled = conversationData
    ? (inputText.trim().length === 0 || isReplying)
    : (!inputText.trim() && !capturedImage) || isAnalyzing;

  const placeholder = conversationData
    ? "Haz una pregunta sobre este producto…"
    : "Escribe el nombre de un producto o ingrediente…";

  return (
    <div className="chat-shell">
      {/* Messages / empty-state area */}
      {conversationData ? (
        <ChatRespuesta messages={messages} isTyping={isReplying} />
      ) : (
        <div className="chat-empty-state">
          <p className="chat-empty-heading">¿Qué producto quieres analizar?</p>
          <p className="chat-empty-sub">Escribe el nombre, o adjunta la fotografía del empaque o etiqueta.</p>
          {submitError && (
            <p className="chat-submit-error" role="alert">{submitError}</p>
          )}
        </div>
      )}

      {/* Camera overlay (full viewport modal) */}
      {cameraActive && (
        <div className="chat-camera-overlay" role="dialog" aria-label="Cámara">
          <video ref={videoRef} className="chat-camera-video" autoPlay playsInline muted />
          <div className="chat-camera-controls">
            <button type="button" className="chat-cam-btn chat-cam-btn--cancel" onClick={() => fileInputRef.current?.click()} aria-label="Subir desde archivos">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button type="button" className="chat-cam-btn chat-cam-btn--capture" onClick={capturePhoto} aria-label="Capturar foto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M20.94 11A8.994 8.994 0 0 0 3.06 11" /><path d="M3.06 13A8.994 8.994 0 0 0 20.94 13" />
              </svg>
            </button>
            <button type="button" className="chat-cam-btn chat-cam-btn--cancel" onClick={stopCamera} aria-label="Cancelar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}

      {/* Image preview strip */}
      {capturedImage && !cameraActive && (
        <div className="chat-image-strip">
          <div className="chat-image-thumb-wrap">
            <img src={capturedImage} alt="Producto adjunto" className="chat-image-thumb" />
            <button type="button" className="chat-image-remove" onClick={() => setCapturedImage(null)} aria-label="Eliminar imagen">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {cameraError && <p className="chat-camera-error" role="alert">{cameraError}</p>}

      {/* Composer */}
      <div className="chat-composer-wrap">
        <form className="chat-composer" onSubmit={handleSubmit} aria-label="Enviar mensaje">
          {/* Camera icon button */}
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Adjuntar imagen"
            onClick={() => {
              if (capturedImage) { setCapturedImage(null); return; }
              startCamera();
            }}
          >
            {capturedImage ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>

          {/* File input (hidden — mobile fallback) */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />

          <label htmlFor="cia-chat-input" className="sr-only">Escribe tu mensaje</label>
          <textarea
            id="cia-chat-input"
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={e => { setInputText(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isBusy}
            className="chat-textarea"
          />

          <button
            type="submit"
            className={`chat-send-btn${isDisabled ? " chat-send-btn--disabled" : ""}`}
            disabled={isDisabled}
            aria-label={isBusy ? (conversationData ? "Respondiendo…" : "Analizando…") : "Enviar"}
          >
            {isBusy ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chat-spin">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
        <p className="chat-disclaimer">SKINOVA acompaña tu cuidado; no reemplaza una consulta dermatológica.</p>
      </div>
    </div>
  );
}
