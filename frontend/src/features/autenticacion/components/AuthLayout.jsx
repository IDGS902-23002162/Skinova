import React from "react";
import "./AuthLayout.css";
import logoUrl from "../../../assets/nuevo-logo-letra.png";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-container">
      {/* Logo en versión móvil (fuera de la card) */}
      <img src={logoUrl} alt="Skinova Logo" className="auth-logo-mobile" />

      <div className="auth-card">
        {/* Lado izquierdo: Formulario (Clerk) */}
        <div className="auth-form-section">
          {/* Logo en versión desktop (dentro de la card) */}
          <img src={logoUrl} alt="Skinova Logo" className="auth-logo-desktop" />

          <div className="auth-form-header">
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          <div className="auth-clerk-wrapper">
            {children}
          </div>
        </div>

        {/* Lado derecho: Imagen decorativa */}
        <div className="auth-image-section">
        </div>
      </div>
    </div>
  );
}
