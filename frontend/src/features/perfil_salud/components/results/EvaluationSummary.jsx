import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function EvaluationSummary({ summary, warnings, requiresProfessionalAttention, variant = 'all' }) {
  const showSummary = variant === 'all' || variant === 'summary';
  const showWarnings = variant === 'all' || variant === 'warnings';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showSummary && summary && (
        <div style={{
          background: 'var(--color-crema, #F6F3EC)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--color-arena, #E7DFD2)',
          boxShadow: '0 4px 12px rgba(29, 40, 37, 0.05)'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            fontFamily: 'var(--font-title, "DM Serif Display", serif)',
            fontSize: '1.2rem',
            color: 'var(--color-bosque-profundo, #163B35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={20} color="var(--color-bosque-medio, #2D6658)" />
            Resumen General
          </h4>
          <p style={{ 
            margin: 0, 
            fontSize: '0.95rem', 
            lineHeight: 1.6, 
            color: 'var(--color-carbon, #1D2825)',
            opacity: 0.9
          }}>
            {summary}
          </p>
        </div>
      )}

      {showWarnings && warnings && warnings.length > 0 && (
        <div style={{
          background: 'rgba(201, 130, 104, 0.1)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid rgba(201, 130, 104, 0.3)',
        }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '1rem',
            color: 'var(--color-terracota, #C98268)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            Advertencias Detectadas
          </h4>
          <ul style={{ margin: 0, paddingLeft: '24px', color: 'var(--color-carbon, #1D2825)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {warnings.map((warning, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {showWarnings && requiresProfessionalAttention && (
        <div style={{
          background: 'var(--color-bosque-profundo, #163B35)',
          color: 'var(--color-crema, #F6F3EC)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 'bold' }}>
              Atención Profesional Recomendada
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, lineHeight: 1.4 }}>
              Hemos detectado signos que podrían requerir la evaluación de un dermatólogo. Consulta a un especialista para un diagnóstico preciso.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
