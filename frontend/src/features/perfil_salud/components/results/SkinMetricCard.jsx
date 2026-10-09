import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const levelLabels = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto'
};

const levelColors = {
  low: 'var(--color-salvia, #A9C4B5)',
  moderate: 'var(--color-arena, #E7DFD2)',
  high: 'rgba(201, 130, 104, 0.4)' // Terracota suave
};

export default function SkinMetricCard({ name, score, level, explanation }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div 
      layout
      onClick={() => setIsOpen(!isOpen)}
      style={{
        background: 'var(--color-crema, #F6F3EC)',
        border: '1px solid var(--color-arena, #E7DFD2)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(29, 40, 37, 0.05)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            fontFamily: 'var(--font-title, "DM Serif Display", serif)',
            color: 'var(--color-bosque-profundo, #163B35)'
          }}>
            {name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-bosque-medio, #2D6658)' }}>
              {score} / 100
            </span>
            <span style={{ 
              fontSize: '0.8rem', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              background: levelColors[level] || levelColors.moderate,
              color: 'var(--color-carbon, #1D2825)',
              fontWeight: 500
            }}>
              {levelLabels[level] || level}
            </span>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={20} color="var(--color-bosque-medio, #2D6658)" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ 
              marginTop: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid var(--color-arena, #E7DFD2)',
              fontSize: '0.95rem',
              color: 'var(--color-carbon, #1D2825)',
              lineHeight: 1.5,
              opacity: 0.9
            }}>
              {explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
