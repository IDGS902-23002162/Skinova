import React, { useState } from 'react';

export default function PielStep({ formData, updateData, onNext, onBack }) {
  const [skinType, setSkinType] = useState(formData.skin_type || "");
  const [sensitivity, setSensitivity] = useState(formData.sensitivity_level || "");
  const [selectedGoals, setSelectedGoals] = useState(formData.goals || []);
  const [showAiMsg, setShowAiMsg] = useState(false);

  const skinTypes = [
    { id: "normal", label: "Normal" },
    { id: "dry", label: "Seca" },
    { id: "oily", label: "Grasa" },
    { id: "combination", label: "Mixta" }
  ];

  const sensitivityLevels = [
    { id: "low", label: "Baja" },
    { id: "medium", label: "Media" },
    { id: "high", label: "Alta" }
  ];

  const goals = [
    { id: "hydration", label: "Hidratación" },
    { id: "oil_control", label: "Control de grasa" },
    { id: "acne", label: "Acné" },
    { id: "spots", label: "Manchas" },
    { id: "texture", label: "Textura" },
    { id: "pores", label: "Poros" },
    { id: "redness", label: "Rojeces" },
    { id: "sensitivity", label: "Sensibilidad" },
    { id: "maintenance", label: "Mantenimiento" }
  ];

  const toggleGoal = (id) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter(g => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  const isFormValid = skinType && sensitivity && selectedGoals.length > 0;

  const handleContinue = () => {
    if (isFormValid) {
      updateData({
        skin_type: skinType,
        sensitivity_level: sensitivity,
        goals: selectedGoals
      });
      onNext();
    }
  };

  const handleAiClick = () => {
    setShowAiMsg(true);
    setTimeout(() => setShowAiMsg(false), 4000);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
      <h2 style={{
        color: "var(--bosque-profundo, #163B35)",
        fontFamily: "DM Serif Display, serif",
        fontSize: "2rem",
        marginBottom: "0.5rem",
        textAlign: "center"
      }}>
        Conozcamos mejor tu piel
      </h2>
      <p style={{
        color: "var(--carbon, #1D2825)",
        fontSize: "1rem",
        marginBottom: "2rem",
        opacity: 0.8,
        textAlign: "center"
      }}>
        Esto nos ayudará a personalizar mejor tus recomendaciones.
      </p>

      {/* Opción IA */}
      <div
        onClick={handleAiClick}
        style={{
          background: "linear-gradient(135deg, var(--arena, #E7DFD2), var(--salvia, #A9C4B5))",
          padding: "16px",
          borderRadius: "12px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: "2rem",
          transition: "transform 0.2s ease"
        }}
      >
        <span style={{ fontWeight: "bold", color: "var(--bosque-profundo, #163B35)" }}> Deja que la IA te ayude</span>
      </div>

      {showAiMsg && (
        <div style={{
          background: "var(--bosque-profundo, #163B35)",
          color: "var(--crema, #F6F3EC)",
          padding: "12px",
          borderRadius: "8px",
          textAlign: "center",
          marginBottom: "2rem",
          fontSize: "0.9rem"
        }}>
          Próximamente podrás recibir ayuda de SKINOVA para conocer mejor tu tipo de piel.
        </div>
      )}

      {/* Tipo de piel */}
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--bosque-profundo, #163B35)" }}>Tipo de piel</h3>
      <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "2rem" }}>
        {skinTypes.map(type => (
          <div
            key={type.id}
            onClick={() => setSkinType(type.id)}
            style={{
              padding: "12px",
              border: `2px solid ${skinType === type.id ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"}`,
              borderRadius: "10px",
              textAlign: "center",
              cursor: "pointer",
              background: skinType === type.id ? "rgba(45, 102, 88, 0.05)" : "transparent",
              color: skinType === type.id ? "var(--bosque-profundo, #163B35)" : "var(--carbon, #1D2825)",
              fontWeight: skinType === type.id ? "bold" : "normal"
            }}
          >
            {type.label}
          </div>
        ))}
      </div>

      {/* Sensibilidad */}
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--bosque-profundo, #163B35)" }}>Nivel de sensibilidad</h3>
      <div className="grid-3-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "3rem" }}>
        {sensitivityLevels.map(level => (
          <div
            key={level.id}
            onClick={() => setSensitivity(level.id)}
            style={{
              padding: "12px",
              border: `2px solid ${sensitivity === level.id ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"}`,
              borderRadius: "10px",
              textAlign: "center",
              cursor: "pointer",
              background: sensitivity === level.id ? "rgba(45, 102, 88, 0.05)" : "transparent",
              color: sensitivity === level.id ? "var(--bosque-profundo, #163B35)" : "var(--carbon, #1D2825)",
              fontWeight: sensitivity === level.id ? "bold" : "normal"
            }}
          >
            {level.label}
          </div>
        ))}
      </div>

      {/* Objetivos */}
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--bosque-profundo, #163B35)" }}>¿Qué quieres conseguir?</h3>
      <div className="goals-container" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "3rem" }}>
        {goals.map(goal => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              className="goals-item"
              onClick={() => toggleGoal(goal.id)}
              style={{
                padding: "8px 16px",
                border: `1px solid ${isSelected ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"}`,
                borderRadius: "20px",
                cursor: "pointer",
                background: isSelected ? "var(--bosque-medio, #2D6658)" : "transparent",
                color: isSelected ? "var(--crema, #F6F3EC)" : "var(--carbon, #1D2825)",
                fontSize: "0.9rem",
                transition: "all 0.2s ease"
              }}
            >
              {goal.label}
            </div>
          );
        })}
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
          onClick={handleContinue}
          disabled={!isFormValid}
          style={{
            flex: 1,
            background: "var(--bosque-profundo, #163B35)",
            color: "var(--crema, #F6F3EC)",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: isFormValid ? "pointer" : "not-allowed",
            opacity: isFormValid ? 1 : 0.5,
            transition: "all 0.2s ease"
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
