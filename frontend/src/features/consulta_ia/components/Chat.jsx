import React, { useState, useRef } from "react";
import { ChatRespuesta } from "./ChatRespuesta";
import "../../../shared/styles/ai_conversation_style.css";

const INITIAL_PLACEHOLDERS = [
  {
    role: "user",
    content: "Hola, empecé a usar retinol hace una semana y noto la piel un poco tirante por las noches. ¿Es normal?",
    time: "09:40"
  },
  {
    role: "assistant",
    content: "Es bastante común sentir tirantez durante las primeras semanas con retinol, mientras la piel se adapta. Algunas ideas que suelen ayudar:\n\n• Aplícalo 2 o 3 noches por semana y aumenta poco a poco.\n• Usa una crema hidratante después, o antes si notas mucha sensibilidad.\n• Mantén protector solar todas las mañanas.\n\nSi aparece ardor intenso, descamación fuerte o enrojecimiento que no cede, conviene pausarlo y consultarlo con tu dermatólogo.",
    time: "09:41"
  }
];

const EXAMPLE_REPLY = "Gracias por contármelo. Lo registro en tu seguimiento para que podamos comparar cómo evoluciona en los próximos días. ¿Notas la sensación en alguna zona en particular, como mejillas o alrededor de la nariz?";

export default function Chat ({ backgroundColor = "#f6f3ec", pageAlignment = "center" }){
  const [messages, setMessages] = useState(INITIAL_PLACEHOLDERS);
  const [inputText, setInputText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const textareaRef = useRef(null);

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

    setTimeout(() => {
      setIsReplying(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: EXAMPLE_REPLY,
          time: getCurrentTime()
        }
      ]);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled = inputText.trim().length === 0 || isReplying;

  return (
    <main className="chat">
      <ChatRespuesta 
        messages={messages} 
        isTyping={isReplying} 
        backgroundColor={backgroundColor}
        alignment={pageAlignment}
      />

      <div className="bottom container">
        <form className="composer" id="composer" onSubmit={handleSubmit}>
          <label htmlFor="chat-input" className="sr-only">
            Escribe tu mensaje
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Cuéntame cómo se siente tu piel hoy…"
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
};