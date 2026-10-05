import React from 'react';
import './PulseButton.css';

export default function PulseButton({ children, onClick, className = "", style = {}, disabled = false }) {
  return (
    <button 
      className={`btn btn-skinova btn-animated ${className}`} 
      onClick={onClick}
      style={style}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
