import React, { useState, useEffect } from 'react';

export default function DermatologicalHistorySection({ profile, onSave }) {
  const [history, setHistory] = useState(profile.dermatological_history || "");
  const [isSaving, setIsSaving] = useState(false);

  const parseHistory = (hist) => {
    if (!hist) return "";
    if (typeof hist === 'string') return hist;
    if (Array.isArray(hist) && hist.length === 0) return "";
    return JSON.stringify(hist);
  };

  const originalHistory = parseHistory(profile.dermatological_history);

  useEffect(() => {
    setHistory(originalHistory);
  }, [originalHistory]);

  const isDirty = history !== originalHistory;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ dermatological_history: history });
    setIsSaving(false);
  };

  const handleCancel = () => {
    setHistory(originalHistory);
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Antecedentes Dermatológicos</h3>
      <p style={styles.subtitle}>Detalla tratamientos importantes, rosácea severa, acné crónico, etc.</p>

      <textarea 
        value={history}
        onChange={(e) => setHistory(e.target.value)}
        placeholder="¿Has tenido tratamientos importantes, rosácea severa, acné crónico?"
        style={styles.textarea}
      />

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
    margin: "0 0 16px 0",
    color: "var(--bosque-profundo, #163B35)",
    opacity: 0.8,
    fontSize: "0.95rem"
  },
  textarea: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid var(--arena, #E7DFD2)",
    fontSize: "1rem",
    backgroundColor: "#FAFAFA",
    color: "var(--carbon, #1D2825)",
    minHeight: "120px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "20px"
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
