import React from "react";
import { Link } from "react-router-dom";
import "./AuthLayout.css";
import logoUrl from "../../../assets/nuevo-logo-letra.png";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-container">
      <svg width="0" height="0" className="auth-svg-defs" aria-hidden="true">
        <defs>
          <clipPath id="sharma-desktop-wave" clipPathUnits="objectBoundingBox">
            <path d="M 0,0 L 0.72,0 C 0.96,0.12 1.04,0.34 0.90,0.48 C 0.78,0.60 0.65,0.64 0.68,0.78 C 0.71,0.90 0.56,0.97 0.36,1 L 0,1 Z" />
          </clipPath>
          <clipPath id="sharma-mobile-wave" clipPathUnits="objectBoundingBox">
            <path d="M 0,0 L 1,0 L 1,0.92 C 0.72,0.74 0.34,1.04 0,0.84 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="auth-image-section" role="img" aria-label="Skinova Skincare">
        <Link to="/" className="auth-logo-mobile-overlay">
          <img src={logoUrl} alt="Skinova Logo" />
        </Link>
      </div>

      <span className="sharma-floating-dot" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-form-section">
          <Link to="/" className="auth-logo-link">
            <img src={logoUrl} alt="Skinova Logo" className="auth-logo-desktop" />
          </Link>

          {(title || subtitle) && (
            <div className="auth-form-header">
              {title && <h1 className="auth-title">{title}</h1>}
              {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            </div>
          )}

          <div className="auth-clerk-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}