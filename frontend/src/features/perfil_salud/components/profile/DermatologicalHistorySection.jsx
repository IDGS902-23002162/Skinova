import React, { useState } from 'react';
import { FileText, Edit2, X, Check, Loader2 } from 'lucide-react';
import './cardsBonitas.css';

export default function DermatologicalHistorySection({ profile, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const parseHistory = (hist) => {
    if (!hist) return "";
    if (typeof hist === 'string') return hist;
    if (Array.isArray(hist) && hist.length === 0) return "";
    return JSON.stringify(hist);
  };

  const originalHistory = parseHistory(profile.dermatological_history);
  const [history, setHistory] = useState(originalHistory);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ dermatological_history: history });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setHistory(originalHistory);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bonita-card">
        <div className="bonita-text">
          <h3 className="bonita-title"><FileText size={20} /> Antecedentes</h3>
          <textarea 
            className="bonita-textarea"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Ej. Tratamientos, rosácea, acné crónico..."
          />
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

  const previewText = originalHistory.length > 40 
    ? originalHistory.substring(0, 40) + "..." 
    : originalHistory;

  return (
    <div className="bonita-card">
      <div className="bonita-text">
        <h3 className="bonita-title"><FileText size={20} /> Antecedentes</h3>
        <div className="bonita-info-text">
          {originalHistory.trim() ? previewText : "Ninguno registrado"}
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
