import React, { useState } from 'react';
import { Target, Edit2, X, Check, Loader2 } from 'lucide-react';
import { goalsList } from '../../constants/perfilOpciones';
import './cardsBonitas.css';

export default function GoalsSection({ profile, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState(profile.goals || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ goals: selectedGoals });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedGoals(profile.goals || []);
    setIsEditing(false);
  };

  const toggleGoal = (id) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter(g => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  const renderSummary = () => {
    if (!profile.goals || profile.goals.length === 0) {
      return <div className="bonita-info-text">Sin objetivos registrados</div>;
    }
    
    const visibleGoals = profile.goals.slice(0, 2);
    const extraCount = profile.goals.length - 2;

    return (
      <>
        {visibleGoals.map(goalId => {
          const goalObj = goalsList.find(g => g.id === goalId);
          return <div key={goalId} className="bonita-info-text">{goalObj ? goalObj.label : goalId}</div>;
        })}
        {extraCount > 0 && <div className="bonita-info-text" style={{color: "var(--bosque-medio, #2D6658)", fontWeight: "500"}}>+ {extraCount} más</div>}
      </>
    );
  };

  if (isEditing) {
    return (
      <div className="bonita-card">
        <div className="bonita-text">
          <h3 className="bonita-title"><Target size={20} /> Objetivos</h3>
          <div className="bonita-badge-container" style={{ marginBottom: 0 }}>
            {goalsList.map(goal => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <div
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className="bonita-badge"
                  style={{
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
        <h3 className="bonita-title"><Target size={20} /> Objetivos</h3>
        {renderSummary()}
      </div>
      <div className="bonita-icons">
        <button className="bonita-btn bonita-btn-edit" onClick={() => setIsEditing(true)}>
          <Edit2 size={20} />
        </button>
      </div>
    </div>
  );
}
