import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function EvaluationEmptyState() {
  return (
    <div style={{ 
      textAlign: "center", 
      color: "var(--color-bosque-profundo, #163B35)", 
      padding: "60px 24px", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center",
      height: "100%"
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--color-arena, #E7DFD2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}
      >
        <Sparkles size={40} color="var(--color-bosque-medio, #2D6658)" />
      </motion.div>
      
      <h3 style={{ 
        fontFamily: 'var(--font-title, "DM Serif Display", serif)', 
        fontSize: '1.6rem', 
        marginBottom: '16px',
        fontWeight: 'normal'
      }}>
        Aún no tienes resultados
      </h3>
      
      <p style={{ 
        opacity: 0.8, 
        marginBottom: '32px',
        maxWidth: '300px',
        lineHeight: 1.5
      }}>
        Realiza tu primer análisis inteligente para conocer a profundidad el estado actual de tu piel y recibir recomendaciones.
      </p>

      <button style={{
        background: 'var(--color-bosque-medio, #2D6658)',
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        padding: '16px 32px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(45, 102, 88, 0.2)',
        transition: 'transform 0.2s',
      }}>
        Comenzar Análisis
      </button>
      <span style={{ fontSize: '0.8rem', marginTop: '12px', opacity: 0.6 }}>
        Próximamente...
      </span>
    </div>
  );
}
