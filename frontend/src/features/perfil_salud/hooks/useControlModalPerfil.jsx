import { useState, useEffect } from 'react';

export function useControlModalPerfil({ isOpen }) {
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'resultados'

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab('perfil');
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return {
    activeTab,
    setActiveTab
  };
}
