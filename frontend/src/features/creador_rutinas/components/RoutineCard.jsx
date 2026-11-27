import React from "react";
import {
  Check,
  Sparkles,
  Info,
  AlertTriangle,
  MoreVertical,
  ShieldCheck,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Globe,
} from "lucide-react";

export default function RoutineCard({
  product,
  isLast,
  isDone,
  isRegenerating,
  isTipOpen,
  isMenuOpen,
  onToggleDone,
  onToggleTip,
  onToggleMenu,
  onReplaceStep,
  onTogglePause,
}) {
  return (
    <article
      className={`product-card ${isDone ? "completed" : ""} ${
        product.paused ? "paused-card" : ""
      }`}
    >
      {/* Orden de aplicación en línea de tiempo (RF-RUT-04) */}
      <div className="timeline">
        <div className={`step-dot ${isDone ? "done-dot" : ""}`}>
          {isDone ? <Check size={16} strokeWidth={3} /> : product.step}
        </div>
        {!isLast && <div className="timeline-line" />}
      </div>

      <div className="product-copy">
        <div className="product-meta">
          <span className="step-label">
            Paso {product.step} · {product.category}
          </span>

          <span className={`badge ${product.badge}`}>
            {product.badge === "ai" && <Sparkles size={12} className="ai-icon" />}
            {product.badge === "ai" ? " ✨ Sugerencia IA" : " 👜 En Mi Neceser"}
          </span>

          {product.paused && (
            <span className="badge paused-badge">
              <PauseCircle size={12} /> En pausa temporal
            </span>
          )}
        </div>

        <h2>{isRegenerating ? "Regenerando este paso con IA..." : product.name}</h2>

        {/* Cantidad, forma de aplicación y frecuencia (RF-RUT-05) */}
        <div className="instructions">
          <div className="inst-block">
            <span>Cantidad: </span>
            <strong>{product.amount}</strong>
          </div>
          <div className="inst-block">
            <span>Aplicación: </span>
            <strong>{product.method}</strong>
          </div>
          <div className="inst-block">
            <span>Frecuencia: </span>
            <strong>{product.frequency}</strong>
          </div>
        </div>

        {/* Validación de incompatibilidades (RF-RUT-09) */}
        {product.incompatibilityNote && (
          <div className="incompatibility-note">
            <ShieldCheck size={15} />
            <span>{product.incompatibilityNote}</span>
          </div>
        )}

        <div className="card-bottom-row">
          {/* Registro de cumplimiento (RF-RUT-16) */}
          <label className="done-control">
            <input
              type="checkbox"
              checked={isDone}
              disabled={product.paused}
              onChange={() => onToggleDone(product.id)}
            />
            <span className="custom-check">
              {isDone && <Check size={14} strokeWidth={3} />}
            </span>
            <span>
              {product.paused
                ? "Producto pausado temporalmente"
                : isDone
                ? "Paso completado"
                : "Marcar como realizado"}
            </span>
          </label>

          {/* Búsqueda web mediante IA (RF-RUT-07) */}
          {product.badge === "ai" && product.webUrl && (
            <a
              href={product.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="web-search-link"
            >
              <Globe size={14} />
              <span>Buscar opciones actuales en la web</span>
            </a>
          )}
        </div>
      </div>

      {/* Acciones del paso */}
      <div className="card-actions">
        <button
          type="button"
          className={`tip-button ${product.warning ? "has-warning" : ""}`}
          onClick={onToggleTip}
          title="Justificación de la recomendación"
        >
          {product.warning ? <AlertTriangle size={18} /> : <Info size={18} />}
        </button>

        <button
          type="button"
          className="more-button"
          onClick={onToggleMenu}
          title="Opciones de este paso"
        >
          <MoreVertical size={20} />
        </button>

        {isTipOpen && (
          <div className={`tooltip ${product.warning ? "warning-tooltip" : ""}`}>
            <strong>
              {product.warning ? "Objetivo y Precaución" : "¿Por qué este paso en tu rutina?"}
            </strong>
            <p>{product.note}</p>
          </div>
        )}

        {isMenuOpen && (
          <div className="context-menu">
            <button type="button" onClick={onReplaceStep}>
              <RefreshCw size={14} />
              <span>Sustituir / Regenerar solo este paso</span>
            </button>

            <button type="button" className="danger" onClick={onTogglePause}>
              {product.paused ? (
                <>
                  <PlayCircle size={14} />
                  <span>Reanudar uso del producto</span>
                </>
              ) : (
                <>
                  <PauseCircle size={14} />
                  <span>Pausar temporalmente</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}