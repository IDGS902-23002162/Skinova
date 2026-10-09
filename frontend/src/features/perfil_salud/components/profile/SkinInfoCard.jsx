import React, { useState } from 'react';
import { Heart, Edit2, X, Check, Loader2 } from 'lucide-react';
import { skinTypes, sensitivityLevels } from '../../constants/perfilOpciones';
import './cardsBonitas.css';

export default function SkinInfoCard({ profile, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [skinType, setSkinType] = useState(profile.skin_type || "");
  const [sensitivity, setSensitivity] = useState(profile.sensitivity_level || "");
  const [isSaving, setIsSaving] = useState(false);

  const getLabel = (list, id) => list.find(item => item.id === id)?.label || id;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ skin_type: skinType, sensitivity_level: sensitivity });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSkinType(profile.skin_type || "");
    setSensitivity(profile.sensitivity_level || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bonita-card">
        <div className="bonita-text">
          <h3 className="bonita-title"><Heart size={20} /> Mi Piel</h3>
          
          <label className="bonita-label">Tipo de Piel</label>
          <div className="bonita-badge-container">
            {skinTypes.map(t => (
              <div
                key={t.id}
                onClick={() => setSkinType(t.id)}
                className="bonita-badge"
                style={{
                  background: skinType === t.id ? "var(--bosque-medio, #2D6658)" : "transparent",
                  color: skinType === t.id ? "var(--crema, #F6F3EC)" : "var(--carbon, #1D2825)",
                  borderColor: skinType === t.id ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"
                }}
              >
                {t.label}
              </div>
            ))}
          </div>

          <label className="bonita-label">Sensibilidad</label>
          <div className="bonita-badge-container" style={{ marginBottom: 0 }}>
            {sensitivityLevels.map(s => (
              <div
                key={s.id}
                onClick={() => setSensitivity(s.id)}
                className="bonita-badge"
                style={{
                  background: sensitivity === s.id ? "var(--bosque-medio, #2D6658)" : "transparent",
                  color: sensitivity === s.id ? "var(--crema, #F6F3EC)" : "var(--carbon, #1D2825)",
                  borderColor: sensitivity === s.id ? "var(--bosque-medio, #2D6658)" : "var(--arena, #E7DFD2)"
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bonita-icons">
          <button className="bonita-btn bonita-btn-cancel" onClick={handleCancel} disabled={isSaving}>
            <X size={20} />
          </button>
          <button className="bonita-btn bonita-btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 size={20} className="bonita-spin" /> : <Check size={20} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bonita-card">
      <div className="bonita-text">
        <h3 className="bonita-title"><Heart size={20} /> Mi Piel</h3>
        <div className="bonita-info-text">{profile.skin_type ? getLabel(skinTypes, profile.skin_type) : "No registrado"}</div>
        <div className="bonita-info-text">Sensibilidad {profile.sensitivity_level ? getLabel(sensitivityLevels, profile.sensitivity_level).toLowerCase() : "desconocida"}</div>
      </div>
      <div className="bonita-icons">
        <button className="bonita-btn bonita-btn-edit" onClick={() => setIsEditing(true)}>
          <Edit2 size={20} />
        </button>
      </div>
    </div>
  );
}
