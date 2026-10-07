import React, { useState, useEffect } from 'react';
import { goalsList } from '../../constants/perfilOpciones';

export default function GoalsSection({ profile, onSave }) {
  const [selectedGoals, setSelectedGoals] = useState(profile.goals || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedGoals(profile.goals || []);
  }, [profile.goals ? profile.goals.join(',') : '']);

  // Check if arrays have same elements
  const isDirty = (() => {
    const original = profile.goals || [];
    if (original.length !== selectedGoals.length) return true;
    const sortedOriginal = [...original].sort();
    const sortedSelected = [...selectedGoals].sort();
    return !sortedOriginal.every((val, index) => val === sortedSelected[index]);
  })();

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ goals: selectedGoals });
    setIsSaving(false);
  };

  const handleCancel = () => {
    setSelectedGoals(profile.goals || []);
  };

  const toggleGoal = (id) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter(g => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>¿Qué quieres conseguir?</h3>
      <p style={styles.subtitle}>Selecciona los objetivos principales para tu piel.</p>
      
      <div style={styles.goalsContainer}>
        {goalsList.map(goal => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              style={{
                ...styles.goalBadge,
                background: isSelected ? "var(--bosque-medio, #2D6658)" : "transparent",
                color: isSelected ? "var(--crema, #F6F3EC)" : "var(--carbon, #1D2825)",
                borderColor: isSelected ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)",
              }}
            >
              {goal.label}
            </div>
          );
        })}
      </div>

      {isDirty && (
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={handleCancel} disabled={isSaving}>Cancelar</button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "var(--salvia, #A9C4B5)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "16px",
    border: "none",
    boxShadow: "0 2px 8px rgba(29,40,37,0.05)"
  },
  title: {
    margin: "0 0 8px 0",
    color: "var(--bosque-profundo, #163B35)",
    fontFamily: "DM Serif Display, serif",
    fontSize: "1.4rem"
  },
  subtitle: {
    margin: "0 0 20px 0",
    color: "var(--bosque-profundo, #163B35)",
    opacity: 0.8,
    fontSize: "0.95rem"
  },
  goalsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px"
  },
  goalBadge: {
    padding: "8px 16px",
    border: "1.5px solid",
    borderRadius: "24px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "all 0.2s ease"
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px"
  },
  cancelBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid var(--bosque-profundo, #163B35)",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    color: "var(--bosque-profundo, #163B35)",
    fontWeight: "500"
  },
  saveBtn: {
    flex: 1,
    background: "var(--bosque-profundo, #163B35)",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    color: "var(--crema, #F6F3EC)",
    fontWeight: "500"
  }
};
