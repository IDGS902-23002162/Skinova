import React from 'react';
import imgPiel from '../../../../../assets/PielStep.webp';
import PulseButton from '../../../../../shared/components/PulseButton';

export default function BienvenidaStep({ onNext }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      {/* Imagen */}
      <img
        className="bienvenida-img"
        src={imgPiel}
        alt="Skinova"
      />

      <h2 style={{
        color: "var(--bosque-profundo, #163B35)",
        fontFamily: "DM Serif Display, serif",
        fontSize: "2rem",
        marginBottom: "1rem"
      }}>
        Conozcamos un poco de ti
      </h2>

      <p style={{
        color: "var(--carbon, #1D2825)",
        fontSize: "1.1rem",
        maxWidth: "400px",
        lineHeight: "1.5",
        opacity: 0.8
      }}>
        Unos cuantos detalles nos ayudarán a personalizar tu experiencia y adaptar SKINOVA a lo que tu piel necesita.
      </p>

      <div style={{ marginTop: "3rem", width: "100%", maxWidth: "300px" }}>
        <PulseButton 
          onClick={onNext}
          style={{ width: "100%" }}
        >
          Comenzar
        </PulseButton>
      </div>
    </div>
  );
}
