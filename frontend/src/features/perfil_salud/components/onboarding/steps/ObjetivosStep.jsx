import React, { useState } from 'react';

export default function ObjetivosStep({ formData, updateData, onNext, onBack }) {
  const [selectedGoals, setSelectedGoals] = useState(formData.goals || []);

  const goals = [
    { id: "hydration", label: "Hidratación" },
    { id: "oil_control", label: "Control de grasa" },
    { id: "acne", label: "Acné" },
    { id: "spots", label: "Manchas" },
    { id: "texture", label: "Textura" },
    { id: "pores", label: "Poros" },
    { id: "redness", label: "Rojeces" },
    { id: "sensitivity", label: "Sensibilidad" },
    { id: "maintenance", label: "Mantenimiento general" }
  ];

  const toggleGoal = (id) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter(g => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  const handleContinue = () => {
    if (selectedGoals.length > 0) {
      updateData({ goals: selectedGoals });
      onNext();
    }
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
        ¿Qué quieres conseguir con tu rutina?
      </h2>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "3rem", justifyContent: "center" }}>
        {goals.map(goal => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div 
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              style={{
                padding: "12px 20px",
                border: `2px solid ${isSelected ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"}`,
                borderRadius: "20px",
                textAlign: "center",
                cursor: "pointer",
                background: isSelected ? "var(--bosque-medio, #2D6658)" : "transparent",
                color: isSelected ? "var(--crema, #F6F3EC)" : "var(--carbon, #1D2825)",
                fontWeight: "500",
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
          disabled={selectedGoals.length === 0}
          style={{
            flex: 1,
            background: "var(--bosque-profundo, #163B35)",
            color: "var(--crema, #F6F3EC)",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: selectedGoals.length > 0 ? "pointer" : "not-allowed",
            opacity: selectedGoals.length > 0 ? 1 : 0.5,
            transition: "all 0.2s ease"
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
