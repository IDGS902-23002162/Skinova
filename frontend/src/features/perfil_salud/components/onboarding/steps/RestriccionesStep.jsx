import React, { useState } from 'react';

export default function RestriccionesStep({ formData, updateData, onNext, onBack }) {
  const [history, setHistory] = useState(formData.dermatological_history || "");
  const [allergies, setAllergies] = useState(formData.allergies || []);
  const [sensitivities, setSensitivities] = useState(formData.sensitivities || []);

  const commonAllergies = [
    { id: "salicilico", label: "Ácido Salicílico" },
    { id: "niacinamida", label: "Niacinamida" },
    { id: "fragancias", label: "Fragancias" },
    { id: "parabenos", label: "Parabenos" },
    { id: "retinol", label: "Retinol" },
    { id: "none", label: "No tengo alergias conocidas" },
    { id: "unknown", label: "Desconozco" }
  ];
  
  const toggleAllergy = (id) => {
    if (id === "none" || id === "unknown") {
      setAllergies([id]);
    } else {
      let newAllergies = allergies.filter(item => item !== "none" && item !== "unknown");
      if (newAllergies.includes(id)) {
        newAllergies = newAllergies.filter(item => item !== id);
      } else {
        newAllergies.push(id);
      }
      setAllergies(newAllergies);
    }
  };

  const handleContinue = () => {
    const noAllergies = allergies.includes("none");
    const unknownAllergies = allergies.includes("unknown");
    const actualAllergies = allergies.filter(a => a !== "none" && a !== "unknown");

    updateData({ 
      dermatological_history: history,
      allergies: actualAllergies,
      sensitivities: sensitivities,
      no_allergies: noAllergies,
      unknown_allergies: unknownAllergies
    });
    onNext();
  };

  const handleSkip = () => {
    // Omitir no guarda nada nuevo, mantiene el formData limpio o como estaba
    onNext();
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
      <h2 style={{ 
        color: "var(--bosque-profundo, #163B35)", 
        fontFamily: "DM Serif Display, serif",
        fontSize: "2rem",
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        Cuidemos lo que tu piel no tolera
      </h2>

      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--bosque-profundo, #163B35)" }}>
          Historial dermatológico previo
        </h3>
        <textarea 
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          placeholder="¿Has tenido tratamientos importantes, rosácea severa, acné crónico?"
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--arena, #E7DFD2)",
            fontSize: "1rem",
            backgroundColor: "#FAFAFA",
            color: "var(--carbon, #1D2825)",
            minHeight: "100px",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--bosque-profundo, #163B35)" }}>
          Alergias o sensibilidades conocidas
        </h3>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "1.5rem" }}>
          {commonAllergies.map(a => (
            <div 
              key={a.id}
              onClick={() => toggleAllergy(a.id)}
              style={{
                padding: "8px 16px",
                border: `1px solid ${allergies.includes(a.id) ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"}`,
                borderRadius: "20px",
                cursor: "pointer",
                background: allergies.includes(a.id) ? "var(--bosque-medio, #2D6658)" : "transparent",
                color: allergies.includes(a.id) ? "var(--crema, #F6F3EC)" : "var(--carbon, #1D2825)",
                fontSize: "0.9rem"
              }}
            >
              {a.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", width: "100%", gap: "1rem", marginTop: "auto" }}>
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
          onClick={handleSkip}
          style={{
            flex: 1,
            background: "transparent",
            color: "var(--carbon, #1D2825)",
            border: "none",
            padding: "14px 24px",
            fontSize: "1rem",
            cursor: "pointer",
            opacity: 0.7
          }}
        >
          Omitir paso
        </button>
        <button 
          onClick={handleContinue}
          style={{
            flex: 1,
            background: "var(--bosque-profundo, #163B35)",
            color: "var(--crema, #F6F3EC)",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
