import React, { useEffect, useRef } from "react";
import "../styles/consulta_conversation_style.css";

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z" />
  </svg>
);

function ScoreBadge({ score, isCompatible }) {
  const color =
    score >= 70 ? { bg: "#E4ECE6", text: "#163B35", border: "#A9C4B5" } :
    score >= 50 ? { bg: "#FFF3CD", text: "#856404", border: "#FFEEBA" } :
                  { bg: "#F9ECE8", text: "#9A5A43", border: "#C98268" };
  return (
    <span className="analysis-score-badge" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
      {score}%
      <span style={{ fontSize: "10px", fontWeight: 500 }}>{isCompatible ? "Compatible" : "Incompatible"}</span>
    </span>
  );
}

function AnalysisCard({ analysis }) {
  if (!analysis) return null;
  return (
    <div className="analysis-card">
      <div className="analysis-card-header">
        <div>
          <div className="analysis-card-label">Producto analizado</div>
          <div className="analysis-card-title">{analysis.subject || "Análisis de Skincare"}</div>
        </div>
        {analysis.compatibility?.score !== undefined && (
          <ScoreBadge score={analysis.compatibility.score} isCompatible={analysis.compatibility.is_compatible} />
        )}
      </div>
      <div className="analysis-card-body">
        {analysis.summary && (
          <p className="analysis-summary">{analysis.summary}</p>
        )}
        {Array.isArray(analysis.key_ingredients) && analysis.key_ingredients.length > 0 && (
          <div>
            <div className="analysis-section-label">Ingredientes clave</div>
            <div className="analysis-ingredients">
              {analysis.key_ingredients.map((ing, i) => (
                <div key={i} className="analysis-ingredient">
                  <strong>{ing.ingredient_name}</strong>
                  {ing.purpose && <span style={{ color: "var(--cia-muted-fg)", marginLeft: 4 }}>— {ing.purpose}</span>}
                  {ing.is_key_active && <span className="analysis-active-tag">Activo</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {analysis.compatibility?.profile_match_reason && (
          <div className="analysis-compat-block">
            <strong>Tu piel: </strong>{analysis.compatibility.profile_match_reason}
          </div>
        )}
        {analysis.compatibility?.neceser_conflict_reason && (
          <div className="analysis-conflict-block">
            <strong>Tu neceser: </strong>{analysis.compatibility.neceser_conflict_reason}
          </div>
        )}
        {Array.isArray(analysis.warnings) && analysis.warnings.length > 0 && (
          <div className="analysis-warnings-block">
            <div className="analysis-warnings-title">Advertencias</div>
            <ul className="analysis-warnings-list">
              {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
        {analysis.requires_professional_attention && (
          <div className="analysis-attention-block">
            ⚠️ Se recomienda evaluación dermatológica antes de incorporar este producto.
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatRespuesta({ messages = [], isTyping = false }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isTyping]);

  return (
    <div className="chat-scroll" ref={scrollRef}>
      <ol className="chat-messages-list" aria-label="Conversación" aria-live="polite">
        {messages.map((msg, index) => (
          <li key={index} className={`msg ${msg.role}`}>
            {msg.role === "assistant" && (
              <span className="msg-avatar" aria-hidden="true"><SparklesIcon /></span>
            )}
            <div className="msg-col">
              <span className="sr-only">{msg.role === "user" ? "Tú:" : "SKINOVA:"}</span>

              {/* Image attachment */}
              {msg.image && (
                <div className="msg-image">
                  <img src={msg.image} alt="Producto adjunto" />
                </div>
              )}

              {/* Analysis card — no preceding text bubble */}
              {msg.analysis && <AnalysisCard analysis={msg.analysis} />}

              {/* Plain text bubble */}
              {msg.content && (
                <div className="msg-bubble">{msg.content}</div>
              )}

              <time className="msg-time">{msg.time}</time>
            </div>
          </li>
        ))}

        {isTyping && (
          <li className="msg assistant">
            <span className="msg-avatar" aria-hidden="true"><SparklesIcon /></span>
            <div className="msg-col">
              <div className="msg-typing" aria-label="SKINOVA está respondiendo…">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}

export default ChatRespuesta;
