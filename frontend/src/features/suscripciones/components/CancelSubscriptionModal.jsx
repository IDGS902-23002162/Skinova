import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import './CancelSubscriptionModal.css';

export default function CancelSubscriptionModal({ isOpen, onClose, onConfirm, isCanceling }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cancel-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} disabled={isCanceling} aria-label="Cerrar modal">
          <X size={20} />
        </button>

        <div className="cancel-modal-header">
          <div className="cancel-icon-badge">
            <AlertTriangle size={26} className="cancel-warning-icon" />
          </div>
          <span className="cancel-tag">GESTIÓN DE PLAN</span>
          <h2 className="cancel-modal-title">¿Deseas cancelar tu suscripción?</h2>
          <p className="cancel-modal-subtitle">
            Al cancelar Skinova Premium, tu plan volverá a <strong>Skinova Free</strong>.
          </p>
        </div>

        <div className="cancel-impact-card">
          <p className="impact-title">Perderás acceso a:</p>
          <ul className="impact-list">
            <li>✦ Análisis ilimitados con inteligencia artificial</li>
            <li>✦ Recomendaciones de productos y rutinas avanzadas</li>
            <li>✦ Comparativas evolutivas de la piel</li>
          </ul>
        </div>

        <div className="cancel-modal-actions">
          <button 
            className="keep-sub-btn" 
            onClick={onClose}
            disabled={isCanceling}
          >
            Mantener mi suscripción
          </button>

          <button 
            className="confirm-cancel-btn" 
            onClick={onConfirm}
            disabled={isCanceling}
          >
            {isCanceling ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Cancelando...</span>
              </>
            ) : (
              'Sí, cancelar suscripción'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
