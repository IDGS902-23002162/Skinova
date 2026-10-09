import React, { useState } from 'react';
import { AlertTriangle, Edit2, X, Check, Loader2 } from 'lucide-react';
import './cardsBonitas.css';

export default function RestrictionsSection({ profile, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [allergies, setAllergies] = useState(profile.allergies || []);
  const [sensitivities, setSensitivities] = useState(profile.sensitivities || []);
  const [newAllergy, setNewAllergy] = useState("");
  const [newSensitivity, setNewSensitivity] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ allergies, sensitivities });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setAllergies(profile.allergies || []);
    setSensitivities(profile.sensitivities || []);
    setNewAllergy("");
    setNewSensitivity("");
    setIsEditing(false);
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

  if (isEditing) {
    return (
      <div className="bonita-card">
        <div className="bonita-text">
          <h3 className="bonita-title"><AlertTriangle size={20} /> Restricciones</h3>

          <div style={{ marginBottom: "16px" }}>
            <label className="bonita-label">Alergias Conocidas</label>
            <div className="bonita-input-row">
              <input 
                className="bonita-input" 
                value={newAllergy} 
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Ej. Niacinamida"
                onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
              />
              <button className="bonita-add-btn" onClick={addAllergy}>+</button>
            </div>
            <div className="bonita-badge-container">
              {allergies.map(a => (
                <span key={a} className="bonita-tag-edit">
                  {a} <span className="bonita-remove-icon" onClick={() => removeAllergy(a)}>×</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 0 }}>
            <label className="bonita-label">Sensibilidades (Opcional)</label>
            <div className="bonita-input-row">
              <input 
                className="bonita-input" 
                value={newSensitivity} 
                onChange={(e) => setNewSensitivity(e.target.value)}
                placeholder="Ej. Fragancia"
                onKeyDown={(e) => e.key === 'Enter' && addSensitivity()}
              />
              <button className="bonita-add-btn" onClick={addSensitivity}>+</button>
            </div>
            <div className="bonita-badge-container" style={{ marginBottom: 0 }}>
              {sensitivities.map(s => (
                <span key={s} className="bonita-tag-edit">
                  {s} <span className="bonita-remove-icon" onClick={() => removeSensitivity(s)}>×</span>
                </span>
              ))}
            </div>
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

  const hasAllergies = profile.allergies && profile.allergies.length > 0;
  const hasSensitivities = profile.sensitivities && profile.sensitivities.length > 0;

  return (
    <div className="bonita-card">
      <div className="bonita-text">
        <h3 className="bonita-title"><AlertTriangle size={20} /> Restricciones</h3>
        <div className="bonita-info-text">
          {hasAllergies ? `${profile.allergies.length} alergia(s)` : "Sin alergias"}
        </div>
        <div className="bonita-info-text">
          {hasSensitivities ? `${profile.sensitivities.length} sensibilidad(es)` : "Sin sensibilidades"}
        </div>
      </div>
      <div className="bonita-icons">
        <button className="bonita-btn bonita-btn-edit" onClick={() => setIsEditing(true)}>
          <Edit2 size={20} />
        </button>
      </div>
    </div>
  );
}
