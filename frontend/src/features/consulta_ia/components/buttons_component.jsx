import React from 'react';

export function ActionButtons({ onSubmit, onClear, submitText = "Analizar producto", clearText = "Borrar todo" }) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', width: '100%' }}>
      {/* Botón Primario: Fondo Bosque (#163B35) */}
      <button
        type="submit"
        onClick={onSubmit}
        style={{
          flex: 1,
          height: '48px',
          backgroundColor: '#163B35',
          color: '#F6F3EC',
          border: 'none',
          borderRadius: '12px',
          fontFamily: 'Manrope, sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#2D6658'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#163B35'}
      >
        {submitText}
      </button>

      {/* Botón Terciario/Secundario de Limpieza */}
      <button
        type="button"
        onClick={onClear}
        style={{
          height: '48px',
          padding: '0 20px',
          backgroundColor: 'transparent',
          color: '#1D2825',
          border: '1px solid #E7DFD2',
          borderRadius: '12px',
          fontFamily: 'Manrope, sans-serif',
          fontSize: '15px',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease, color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#C98268';
          e.target.style.color = '#C98268';
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = '#E7DFD2';
          e.target.style.color = '#1D2825';
        }}
      >
        {clearText}
      </button>
    </div>
  );
}
export default ActionButtons;