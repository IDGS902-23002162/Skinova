import React from 'react';
import { useProfileData } from '../hooks/useProfileData';
import RestrictionsSection from '../components/profile/RestrictionsSection';
import DermatologicalHistorySection from '../components/profile/DermatologicalHistorySection';

export default function RestriccionesTab() {
  const { profile, loading, saveProfile } = useProfileData();

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--bosque-profundo, #163B35)" }}>Cargando...</div>;
  }

  if (!profile) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--terracota, #C98268)" }}>Error cargando perfil.</div>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 0" }}>
      <h2 style={{ 
        color: "var(--bosque-profundo, #163B35)", 
        fontFamily: "DM Serif Display, serif", 
        fontSize: "2rem",
        marginBottom: "24px"
      }}>
        Mis Restricciones
      </h2>
      <RestrictionsSection profile={profile} onSave={saveProfile} />
      <DermatologicalHistorySection profile={profile} onSave={saveProfile} />
    </div>
  );
}
