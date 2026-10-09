import React from 'react';

export function ProductInput({ value, onChange, placeholder = "Ej. Crema hidratante con ceramidas..." }) {
  return (
    <div className="product-input-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <label 
        htmlFor="product-name-input" 
        style={{ 
          fontFamily: 'Manrope, sans-serif', 
          fontSize: '15px', 
          fontWeight: 500, 
          color: '#1D2825' 
        }}
      >
        Nombre del producto o ingrediente
      </label>
      <input
        id="product-name-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '48px',
          padding: '0 16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7DFD2',
          borderRadius: '12px',
          fontFamily: 'Manrope, sans-serif',
          fontSize: '15px',
          color: '#1D2825',
          outline: 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxSizing: 'border-box'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#2D6658';
          e.target.style.boxShadow = '0 0 0 3px rgba(169, 196, 181, 0.25)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#E7DFD2';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}
export default ProductInput;