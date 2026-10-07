import React, { useState, useEffect } from 'react';
import { skinTypes, sensitivityLevels } from '../../constants/perfilOpciones';

export default function SkinInfoCard({ profile, onSave }) {
  const [skinType, setSkinType] = useState(profile.skin_type || "");
  const [sensitivity, setSensitivity] = useState(profile.sensitivity_level || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if profile changes externally
  useEffect(() => {
    setSkinType(profile.skin_type || "");
    setSensitivity(profile.sensitivity_level || "");
  }, [profile.skin_type, profile.sensitivity_level]);

  const isDirty = skinType !== (profile.skin_type || "") || sensitivity !== (profile.sensitivity_level || "");

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ skin_type: skinType, sensitivity_level: sensitivity });
    setIsSaving(false);
  };

  const handleCancel = () => {
    setSkinType(profile.skin_type || "");
    setSensitivity(profile.sensitivity_level || "");
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Tipo y Sensibilidad</h3>
      
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Tipo de Piel</label>
        <select value={skinType} onChange={(e) => setSkinType(e.target.value)} style={styles.select}>
          <option value="">Selecciona...</option>
          {skinTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Nivel de Sensibilidad</label>
        <select value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} style={styles.select}>
          <option value="">Selecciona...</option>
          {sensitivityLevels.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
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
    margin: "0 0 20px 0",
    color: "var(--bosque-profundo, #163B35)",
    fontFamily: "DM Serif Display, serif",
    fontSize: "1.4rem"
  },
  fieldGroup: {
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column"
  },
  label: {
    fontSize: "0.95rem",
    marginBottom: "8px",
    color: "var(--carbon, #1D2825)",
    fontWeight: "500"
  },
  select: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid var(--arena, #E7DFD2)",
    backgroundColor: "#fff",
    color: "var(--carbon, #1D2825)",
    fontSize: "1rem",
    outline: "none"
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px"
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
