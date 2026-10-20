import React from 'react';
import { Check, X } from 'lucide-react';
import './SubCards.css';

export default function SubCards({ isRegistered = true, isPremium = false }) {
  return (
    <div className="subscriptions-container">
      {/* Card 1 — Skinova Free */}
      <div className="sub-card">
        <section className="sub-header">
          <p className="plan-name">Skinova Free</p>
          <p className="plan-price">$0 <span style={{fontSize: '1rem', fontWeight: 'normal'}}>MXN</span></p>
          <p className="plan-price-secondary">Para siempre</p>
          <p className="plan-description">
            Empieza a cuidar tu piel con las herramientas esenciales de Skinova.
          </p>
        </section>

        <ul className="features-list">
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Perfil y salud de la piel</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Registro de tipo de piel, sensibilidad y objetivos</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Mi Neceser</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Crear y administrar rutinas</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Bitácora básica de progreso</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Acceso a la comunidad</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Directorio dermatológico</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Seguimiento básico de productos y hábitos</span>
          </li>
          <li className="feature-item disabled">
            <X size={18} className="feature-icon disabled" />
            <span>Análisis con inteligencia artificial limitado</span>
          </li>
          <li className="feature-item disabled">
            <X size={18} className="feature-icon disabled" />
            <span>Historial de IA limitado</span>
          </li>
          <li className="feature-item disabled">
            <X size={18} className="feature-icon disabled" />
            <span>Comparaciones avanzadas no disponibles</span>
          </li>
        </ul>

        <div className="sub-action">
          <button className={`sub-button ${!isPremium ? 'secondary' : 'secondary'}`}>
            {!isRegistered ? "Comenzar gratis" : "Plan actual"}
          </button>
        </div>
      </div>

      {/* Card 2 — Skinova Premium */}
      <div className="sub-card premium">
        <div className="badge-container">
          <div className="badge">
            Más completo
          </div>
        </div>
        <section className="sub-header">
          <p className="plan-name">Skinova Premium</p>
          <p className="plan-price">$99 <span style={{fontSize: '1rem', fontWeight: 'normal'}}>MXN / mes</span></p>
          <p className="plan-price-secondary">Cancela cuando quieras.</p>
          <p className="plan-description">
            Obtén una experiencia más personalizada con inteligencia artificial y herramientas avanzadas de seguimiento.
          </p>
        </section>

        <ul className="features-list">
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span><strong>Todo lo incluido en Skinova Free</strong></span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Más análisis de piel con inteligencia artificial</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Recomendaciones personalizadas con IA</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Historial completo de análisis de IA</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Comparación avanzada del progreso de la piel</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Seguimiento avanzado mediante la bitácora</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Información más detallada sobre rutinas y productos</span>
          </li>
          <li className="feature-item">
            <Check size={18} className="feature-icon" />
            <span>Acceso a futuras funciones premium</span>
          </li>
        </ul>

        <div className="sub-action">
          <button className={`sub-button ${isPremium ? 'secondary' : 'primary'}`}>
            {isPremium ? "Plan actual" : "Obtener Premium"}
          </button>
        </div>
      </div>
    </div>
  );
}
