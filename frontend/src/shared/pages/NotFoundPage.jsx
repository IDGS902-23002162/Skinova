import React from "react";
import { Link } from "react-router-dom";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Parece que te has desviado</h2>
        <p className="not-found-text">
          Tranquilo/a, hasta las mejores rutinas tienen un desvío. La página que buscas no está disponible o ha cambiado de lugar.
        </p>

        <Link to="/" className="not-found-btn">
          Volver
        </Link>
      </div>
    </div>
  );
}
