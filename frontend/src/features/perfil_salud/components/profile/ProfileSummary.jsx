import React, { useEffect, useState } from 'react';
import { useApi } from '../../../../shared/hooks/useApi';
import SkinInfoCard from './SkinInfoCard';
import GoalsSection from './GoalsSection';
import RestrictionsSection from './RestrictionsSection';

export default function ProfileSummary() {
  const { fetchConAuth } = useApi();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const response = await fetchConAuth('/perfil-salud/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (updatedFields) => {
    try {
      const response = await fetchConAuth('/perfil-salud/profile', {
        method: 'PUT',
        body: JSON.stringify(updatedFields)
      });
      if (response.ok) {
        // Optimistic update
        setProfile(prev => ({ ...prev, ...updatedFields }));
      } else {
        console.error("Error saving profile");
        // Reload to revert
        loadProfile();
      }
    } catch (error) {
      console.error("Network error", error);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--bosque-profundo, #163B35)" }}>Cargando perfil...</div>;
  }

  if (!profile) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--terracota, #C98268)" }}>No se pudo cargar el perfil.</div>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 0" }}>
      <h2 style={{ 
        color: "var(--bosque-profundo, #163B35)", 
        fontFamily: "DM Serif Display, serif", 
        fontSize: "2rem",
        marginBottom: "24px"
      }}>
        {profile.preferred_name ? `Hola, ${profile.preferred_name}` : 'Tu perfil de piel'}
      </h2>

      <SkinInfoCard profile={profile} onSave={handleSave} />
      <GoalsSection profile={profile} onSave={handleSave} />
      <RestrictionsSection profile={profile} onSave={handleSave} />
      
      {/* AI Placeholder Card */}
      <div style={{
        background: "linear-gradient(135deg, var(--arena, #E7DFD2), var(--salvia, #A9C4B5))",
        borderRadius: "16px",
        padding: "24px",
        textAlign: "center",
        marginTop: "32px",
        boxShadow: "0 4px 12px rgba(29,40,37,0.1)"
      }}>
        <h3 style={{ 
          color: "var(--bosque-profundo, #163B35)", 
          fontFamily: "DM Serif Display, serif",
          fontSize: "1.4rem",
          margin: "0 0 8px 0"
        }}>
          Análisis inteligente próximamente
        </h3>
        <p style={{ color: "var(--carbon, #1D2825)", margin: 0, opacity: 0.8, fontSize: "0.95rem" }}>
          Pronto podrás obtener un análisis avanzado de tu piel potenciado por IA.
        </p>
      </div>
    </div>
  );
}
