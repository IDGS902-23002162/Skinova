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

              {msg.image && (
                <div style={{ marginBottom: "8px", maxWidth: "240px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--sand, #E7DFD2)" }}>
                  <img src={msg.image} alt="Producto capturado" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              )}

              {msg.analysis && (
                <div className="analysis-card" style={{
                  background: "#ffffff",
                  border: "1px solid var(--sand, #E7DFD2)",
                  borderRadius: "16px",
                  padding: "18px",
                  marginBottom: "10px",
                  boxShadow: "0 4px 16px rgba(22, 59, 53, 0.06)",
                  color: "var(--charcoal, #1D2825)"
                }}>
                  {/* Header with subject & score */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px", borderBottom: "1px solid var(--sand, #E7DFD2)", paddingBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-fg, #55615c)", fontWeight: 600 }}>Producto analizado</span>
                      <h3 style={{ margin: "2px 0 0", fontSize: "18px", color: "var(--forest, #163B35)" }}>{msg.analysis.subject || "Análisis de Skincare"}</h3>
                    </div>
                    {msg.analysis.compatibility?.score !== undefined && (
                      <div style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontWeight: 700,
                        fontSize: "13px",
                        background: msg.analysis.compatibility.score >= 70 ? "#e4ece6" : msg.analysis.compatibility.score >= 50 ? "#fff3cd" : "#f9ece8",
                        color: msg.analysis.compatibility.score >= 70 ? "#163B35" : msg.analysis.compatibility.score >= 50 ? "#856404" : "#9A5A43",
                        border: `1px solid ${msg.analysis.compatibility.score >= 70 ? "#a9c4b5" : msg.analysis.compatibility.score >= 50 ? "#ffeeba" : "#c98268"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <span>{msg.analysis.compatibility.score}%</span>
                        <span style={{ fontSize: "11px", fontWeight: 500 }}>
                          {msg.analysis.compatibility.is_compatible ? "Compatible" : "Incompatible"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Resumen */}
                  {msg.analysis.summary && (
                    <p style={{ margin: "0 0 14px", fontSize: "14px", lineHeight: "1.6" }}>
                      {msg.analysis.summary}
                    </p>
                  )}

                  {/* Ingredientes clave */}
                  {Array.isArray(msg.analysis.key_ingredients) && msg.analysis.key_ingredients.length > 0 && (
                    <div style={{ marginBottom: "14px" }}>
                      <h4 style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--forest-mid, #2D6658)", margin: "0 0 8px", fontWeight: 700 }}>
                        Ingredientes Clave
                      </h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {msg.analysis.key_ingredients.map((ing, i) => (
                          <div key={i} style={{
                            background: ing.is_key_active ? "var(--sand, #F6F3EC)" : "#FDFBF7",
                            border: "1px solid var(--sand, #E7DFD2)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            lineHeight: "1.4"
                          }}>
                            <strong>{ing.ingredient_name}</strong>
                            {ing.purpose && <span style={{ color: "var(--muted-fg, #55615c)", marginLeft: "4px" }}>— {ing.purpose}</span>}
                            {ing.is_key_active && (
                              <span style={{ marginLeft: "6px", fontSize: "10px", background: "var(--forest, #163B35)", color: "#fff", padding: "1px 5px", borderRadius: "4px" }}>
                                Activo
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compatibilidad con el perfil */}
                  {msg.analysis.compatibility?.profile_match_reason && (
                    <div style={{
                      background: "var(--accent, #e4ece6)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "10px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "var(--forest, #163B35)"
                    }}>
                      <strong>Compatibilidad con tu piel: </strong>
                      {msg.analysis.compatibility.profile_match_reason}
                    </div>
                  )}

                  {/* Conflicto con neceser */}
                  {msg.analysis.compatibility?.neceser_conflict_reason && (
                    <div style={{
                      background: "#FFF4E5",
                      border: "1px solid #FFE2B8",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "10px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "#9A5A43"
                    }}>
                      <strong>Interacción con tu neceser: </strong>
                      {msg.analysis.compatibility.neceser_conflict_reason}
                    </div>
                  )}

                  {/* Advertencias */}
                  {Array.isArray(msg.analysis.warnings) && msg.analysis.warnings.length > 0 && (
                    <div style={{
                      background: "#F9ECE8",
                      border: "1px solid var(--terracotta, #c98268)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "10px"
                    }}>
                      <h5 style={{ margin: "0 0 6px", fontSize: "12px", color: "#9A5A43", textTransform: "uppercase" }}>
                        Advertencias y precauciones
                      </h5>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#9A5A43", lineHeight: "1.5" }}>
                        {msg.analysis.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Atención profesional */}
                  {msg.analysis.requires_professional_attention && (
                    <div style={{
                      background: "#FBEAE8",
                      borderLeft: "4px solid #A5483C",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#A5483C",
                      marginTop: "10px"
                    }}>
                      ⚠️ Requiere evaluación dermatológica: Se recomienda consultar a un especialista antes de incorporar este producto a tu rutina.
                    </div>
                  )}
                </div>
              )}

              {msg.content && (
                <div className="bubble" style={{ whiteSpace: "pre-line" }}>
                  {msg.content}
                </div>
              )}
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
              <span className="sr-only">SKINOVA está analizando...</span>
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

export default ChatRespuesta;
