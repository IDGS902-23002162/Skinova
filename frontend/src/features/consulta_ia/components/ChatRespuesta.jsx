import React, { useEffect, useRef } from "react";
import "../../../shared/styles/ai_conversation_style.css";

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </svg>
);

export const ChatRespuesta = ({ 
  messages = [], 
  isTyping = false, 
  backgroundColor = "transparent", 
  alignment = "center" 
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isTyping]);

  return (
    <div 
      className="scroll" 
      id="scroll" 
      ref={scrollRef}
      style={{ 
        backgroundColor: backgroundColor, 
        justifyContent: alignment === "center" ? "center" : "flex-start" 
      }}
    >
      <ol className="messages container" id="messages" aria-label="Conversación" aria-live="polite">
        {messages.map((msg, index) => (
          <li key={index} className={`msg ${msg.role}`}>
            {msg.role === "assistant" && (
              <span className="avatar" aria-hidden="true">
                <SparklesIcon />
              </span>
            )}
            <div className="msg-col">
              <span className="sr-only">
                {msg.role === "user" ? "Tú dijiste:" : "SKINOVA respondió:"}
              </span>
              <div className="bubble" style={{ whiteSpace: "pre-line" }}>
                {msg.content}
              </div>
              <time className="time">{msg.time}</time>
            </div>
          </li>
        ))}

        {isTyping && (
          <li className="msg assistant">
            <span className="avatar" aria-hidden="true">
              <SparklesIcon />
            </span>
            <div className="typing">
              <span className="sr-only">SKINOVA está escribiendo</span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
};