import React, { useState, useRef, useEffect } from "react";
import { ChatRespuesta } from "./ChatRespuesta";
import "../../../shared/styles/ai_conversation_style.css";

const parseAnalysisData = (data) => {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
};

const createInitialMessages = (conversationData) => {
  if (!conversationData) {
    return [
      {
        role: "user",
        content: "Hola, ¿cómo puedo consultar un producto para mi piel?",
        time: "09:40"
      },
      {
        role: "assistant",
        content: "¡Hola! Puedes escribir el nombre del producto o tomar una fotografía de su empaque o lista de ingredientes desde la opción 'Nueva consulta'. Analizaré su compatibilidad con tu tipo de piel y los productos de tu neceser.",
        time: "09:41"
      }
    ];
  }

  const analysis = parseAnalysisData(conversationData.analysis);
  const currentTime = conversationData.time || new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  const userQuery = conversationData.query_text || conversationData.search_query || conversationData.title || "Consulta de producto";

  const msgs = [
    {
      role: "user",
      content: userQuery,
      image: conversationData.image || null,
      time: currentTime
    }
  ];

  if (analysis) {
    msgs.push({
      role: "assistant",
      content: "He analizado los ingredientes del producto en base a tu perfil dermatológico y neceser:",
      analysis: analysis,
      time: currentTime
    });
  } else if (conversationData.preview) {
    msgs.push({
      role: "assistant",
      content: conversationData.preview,
      time: currentTime
    });
  }

  return msgs;
};

export default function Chat({
  conversationData = null,
  onNewConsultation = null,
  backgroundColor = "#f6f3ec",
  pageAlignment = "center"
}) {
  const [messages, setMessages] = useState(() => createInitialMessages(conversationData));
  const [inputText, setInputText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const textareaRef = useRef(null);

  // Sincronizar mensajes cuando cambia conversationData
  useEffect(() => {
    setMessages(createInitialMessages(conversationData));
  }, [conversationData]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  };

  const handleAutoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    handleAutoResize();
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isReplying) return;

    const userMsg = {
      role: "user",
      content: text,
      time: getCurrentTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsReplying(true);

    const activeAnalysis = parseAnalysisData(conversationData?.analysis);
    const subject = activeAnalysis?.subject || conversationData?.title || "este producto";

    setTimeout(() => {
      setIsReplying(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Respecto a "${subject}": recuerda incorporarlo de forma paulatina en tu rutina. Si tienes dudas sobre sensaciones de tirantez o reacción, observa tu piel por 48 horas y no dudes en consultar a un especialista ante cualquier irritación persistente.`,
          time: getCurrentTime()
        }
      ]);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled = inputText.trim().length === 0 || isReplying;

  return (
    <main className="chat" style={{ height: "auto", minHeight: "500px", display: "flex", flexDirection: "column" }}>
      {onNewConsultation && (
        <div style={{ padding: "8px 16px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onNewConsultation}
            className="pa-btn pa-btn--ghost"
            style={{ fontSize: "13px", height: "36px", padding: "0 14px", borderRadius: "10px" }}
          >
            + Nueva consulta
          </button>
        </div>
      )}

      <ChatRespuesta 
        messages={messages} 
        isTyping={isReplying} 
        backgroundColor={backgroundColor}
        alignment={pageAlignment}
      />

      <div className="bottom container">
        <form className="composer" id="composer" onSubmit={handleSubmit}>
          <label htmlFor="chat-input" className="sr-only">
            Escribe tu pregunta de seguimiento
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Haz una pregunta sobre este producto o cómo usarlo…"
          />
          <button
            type="submit"
            className="send"
            id="send"
            aria-label="Enviar mensaje"
            disabled={isSubmitDisabled}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </button>
        </form>
        <p className="disclaimer">
          SKINOVA acompaña tu cuidado; no reemplaza una consulta dermatológica.
        </p>
      </div>
    </main>
  );
}
