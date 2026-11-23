import React from 'react';
import { X, Lock, CreditCard } from 'lucide-react';
import './ConfirmationModal.css';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, planName = "Skinova Premium", planPrice = "$99 MXN / mes" }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose} aria-label="Cerrar modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="icon-container">
            <CreditCard size={24} className="header-icon" />
          </div>
          <p className="step-text">PASO 1 DE 2 · CONFIRMACIÓN</p>
          <h2 className="modal-title">Confirma tu suscripción</h2>
          <p className="modal-subtitle">Revisa los detalles antes de continuar al pago seguro.</p>
        </div>

        <div className="plan-summary-card">
          <div className="summary-row">
            <span className="summary-label">Plan</span>
            <span className="summary-value">{planName}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Precio</span>
            <span className="summary-value">{planPrice}</span>
          </div>
        </div>

        <div className="secure-payment-info">
          <Lock size={16} />
          <span>Pago procesado de forma segura por Stripe</span>
        </div>

        <div className="modal-actions">
          <button className="continue-button" onClick={onConfirm}>
            Continuar al pago
          </button>
          <button className="cancel-button" onClick={onClose}>
            Volver a los planes
          </button>
        </div>
      </div>
    </div>
  );
}
