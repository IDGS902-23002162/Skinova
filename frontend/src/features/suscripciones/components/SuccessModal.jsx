import React from 'react';
import { X, Sparkles, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import './SuccessModal.css';

export default function SuccessModal({ isOpen, onClose, onExplore }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Cerrar modal">
          <X size={20} />
        </button>

        <div className="success-modal-header">
          <div className="success-icon-badge">
            <Sparkles size={28} className="success-sparkle-icon" />
          </div>
          <span className="success-pill">✦ PLAN PREMIUM ACTIVO</span>
          <h2 className="success-modal-title">¡Bienvenido a Skinova Premium!</h2>
          <p className="success-modal-subtitle">
            Tu suscripción se ha completado con éxito. A partir de este momento tienes acceso ilimitado a todas las herramientas avanzadas para acompañar y entender el cuidado de tu piel.
          </p>
        </div>

        <div className="success-perks-card">
          <p className="perks-heading">Beneficios desbloqueados:</p>
          <ul className="perks-list">
            <li>
              <div className="perk-check">
                <Check size={14} />
              </div>
              <div>
                <strong>Análisis ilimitados con IA</strong>
                <span>Evaluaciones dérmicas profundas sin restricciones.</span>
              </div>
            </li>
            <li>
              <div className="perk-check">
                <Check size={14} />
              </div>
              <div>
                <strong>Recomendaciones personalizadas avanzadas</strong>
                <span>Rutinas e ingredientes activos específicos para tus objetivos.</span>
              </div>
            </li>
            <li>
              <div className="perk-check">
                <Check size={14} />
              </div>
              <div>
                <strong>Historial completo y comparativas</strong>
                <span>Seguimiento continuo de la evolución de tu piel.</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="success-note">
          <ShieldCheck size={16} />
          <span>Suscripción de $99 MXN / mes · Administra o cancela cuando quieras.</span>
        </div>

        <div className="success-modal-actions">
          <button className="success-primary-btn" onClick={onExplore || onClose}>
            <span>Ir al Dashboard</span>
            <ArrowRight size={18} />
          </button>
          <button className="success-secondary-btn" onClick={onClose}>
            Permanecer en suscripciones
          </button>
        </div>
      </div>
    </div>
  );
}
