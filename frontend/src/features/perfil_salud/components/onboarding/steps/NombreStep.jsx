import React, { useState } from 'react';

export default function NombreStep({ formData, updateData, onNext, onBack }) {
  const [name, setName] = useState(formData.preferred_name || "");

  const handleContinue = () => {
    if (name.trim()) {
      updateData({ preferred_name: name.trim() });
      onNext();
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", width: "100%", maxWidth: "400px", margin: "0 auto" }}>
      <h2 style={{ 
        color: "var(--bosque-profundo, #163B35)", 
        fontFamily: "DM Serif Display, serif",
        fontSize: "2rem",
        marginBottom: "1rem"
      }}>
        ¿Cómo quieres que te llamemos?
      </h2>
      
      <p style={{ 
        color: "var(--carbon, #1D2825)", 
        fontSize: "1rem",
        marginBottom: "2rem",
        opacity: 0.8
      }}>
        Usaremos este nombre para hacer tu experiencia más cercana.
        <br />
        <span style={{ fontStyle: "italic", opacity: 0.6 }}>Ejemplo: Buenos días, Erick</span>
      </p>

      <input 
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre o apodo"
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid var(--arena, #E7DFD2)",
          fontSize: "1.1rem",
          backgroundColor: "#FAFAFA",
          color: "var(--carbon, #1D2825)",
          marginBottom: "3rem",
          outline: "none",
          transition: "border-color 0.2s ease"
        }}
        autoFocus
      />

      <div style={{ display: "flex", width: "100%", gap: "1rem" }}>
        <button 
          onClick={onBack}
          style={{
            flex: 1,
            background: "transparent",
            color: "var(--bosque-profundo, #163B35)",
            border: "1px solid var(--bosque-profundo, #163B35)",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Atrás
        </button>
        <button 
          onClick={handleContinue}
          disabled={!name.trim()}
          style={{
            flex: 1,
            background: "var(--bosque-profundo, #163B35)",
            color: "var(--crema, #F6F3EC)",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5,
            transition: "all 0.2s ease"
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
