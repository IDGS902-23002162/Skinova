import React, { useState, useEffect } from 'react';

export default function RestrictionsSection({ profile, onSave }) {
  const [allergies, setAllergies] = useState(profile.allergies || []);
  const [sensitivities, setSensitivities] = useState(profile.sensitivities || []);
  const [newAllergy, setNewAllergy] = useState("");
  const [newSensitivity, setNewSensitivity] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAllergies(profile.allergies || []);
    setSensitivities(profile.sensitivities || []);
  }, [
    profile.allergies ? profile.allergies.join(',') : '',
    profile.sensitivities ? profile.sensitivities.join(',') : ''
  ]);

  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, i) => val === sortedB[i]);
  };

  const isDirty = !arraysEqual(allergies, profile.allergies || []) || 
                  !arraysEqual(sensitivities, profile.sensitivities || []);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ allergies, sensitivities });
    setIsSaving(false);
  };

  const handleCancel = () => {
    setAllergies(profile.allergies || []);
    setSensitivities(profile.sensitivities || []);
    setNewAllergy("");
    setNewSensitivity("");
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (item) => {
    setAllergies(allergies.filter(a => a !== item));
  };

  const addSensitivity = () => {
    if (newSensitivity.trim() && !sensitivities.includes(newSensitivity.trim())) {
      setSensitivities([...sensitivities, newSensitivity.trim()]);
      setNewSensitivity("");
    }
  };

  const removeSensitivity = (item) => {
    setSensitivities(sensitivities.filter(a => a !== item));
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Alergias y Sensibilidades</h3>
      <p style={styles.subtitle}>Evita ingredientes que no le sientan bien a tu piel.</p>

      <div style={styles.section}>
        <label style={styles.label}>Alergias Conocidas</label>
        <div style={styles.inputRow}>
          <input 
            style={styles.input} 
            value={newAllergy} 
            onChange={(e) => setNewAllergy(e.target.value)}
            placeholder="Ej. Niacinamida, Ácido Salicílico"
            onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
          />
          <button style={styles.addBtn} onClick={addAllergy}>+</button>
        </div>
        <div style={styles.tagsContainer}>
          {allergies.map(a => (
            <span key={a} style={styles.tagEdit}>
              {a} <span style={styles.removeIcon} onClick={() => removeAllergy(a)}>×</span>
            </span>
          ))}
          {allergies.length === 0 && <span style={styles.emptyText}>Ninguna registrada</span>}
        </div>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Sensibilidades (Opcional)</label>
        <div style={styles.inputRow}>
          <input 
            style={styles.input} 
            value={newSensitivity} 
            onChange={(e) => setNewSensitivity(e.target.value)}
            placeholder="Ej. Fragancia, Alcohol"
            onKeyDown={(e) => e.key === 'Enter' && addSensitivity()}
          />
          <button style={styles.addBtn} onClick={addSensitivity}>+</button>
        </div>
        <div style={styles.tagsContainer}>
          {sensitivities.map(s => (
            <span key={s} style={styles.tagEdit}>
              {s} <span style={styles.removeIcon} onClick={() => removeSensitivity(s)}>×</span>
            </span>
          ))}
          {sensitivities.length === 0 && <span style={styles.emptyText}>Ninguna registrada</span>}
        </div>
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
    backgroundColor: "var(--crema, #F6F3EC)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "16px",
    border: "1px solid var(--arena, #E7DFD2)",
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
    color: "var(--carbon, #1D2825)",
    opacity: 0.7,
    fontSize: "0.95rem"
  },
  section: {
    marginBottom: "24px"
  },
  label: {
    fontSize: "0.95rem",
    marginBottom: "8px",
    color: "var(--carbon, #1D2825)",
    display: "block",
    fontWeight: "500"
  },
  inputRow: {
    display: "flex",
    gap: "10px"
  },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid var(--arena, #E7DFD2)",
    backgroundColor: "#fff",
    color: "var(--carbon, #1D2825)",
    fontSize: "1rem",
    outline: "none"
  },
  addBtn: {
    background: "var(--bosque-medio, #2D6658)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0 20px",
    cursor: "pointer",
    fontSize: "1.4rem",
    lineHeight: "1"
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "12px"
  },
  tagEdit: {
    padding: "6px 14px",
    backgroundColor: "rgba(201, 130, 104, 0.15)", // Terracota suave
    color: "var(--terracota, #C98268)",
    borderRadius: "20px",
    fontSize: "0.9rem",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  removeIcon: {
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.2rem",
    lineHeight: "1"
  },
  emptyText: {
    fontSize: "0.9rem",
    color: "var(--carbon, #1D2825)",
    opacity: 0.5,
    fontStyle: "italic"
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "16px"
  },
  cancelBtn: {
    flex: 1,
    background: "transparent",
    border: "1px solid var(--arena, #E7DFD2)",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    color: "var(--carbon, #1D2825)",
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
