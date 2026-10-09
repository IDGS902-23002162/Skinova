import { Camera } from 'lucide-react';
import { useProfileData } from '../hooks/useProfileData';
import SkinInfoCard from '../components/profile/SkinInfoCard';
import GoalsSection from '../components/profile/GoalsSection';
import RestrictionsSection from '../components/profile/RestrictionsSection';
import DermatologicalHistorySection from '../components/profile/DermatologicalHistorySection';
import '../components/profile/CardTranslucent.css';

export default function MiPielTab() {
  const { profile, loading, saveProfile } = useProfileData();

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--bosque-profundo, #163B35)" }}>Cargando...</div>;
  }

  if (!profile) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--terracota, #C98268)" }}>Error cargando perfil.</div>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px 0" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ 
          color: "var(--bosque-profundo, #163B35)", 
          fontFamily: "DM Serif Display, serif", 
          fontSize: "2rem",
          margin: "0 0 8px 0"
        }}>
          {profile.preferred_name ? `Hola, ${profile.preferred_name}` : 'Mi Piel'}
        </h2>
        <p style={{ color: "var(--carbon, #1D2825)", opacity: 0.8, margin: 0, fontSize: "1rem" }}>
          Así conocemos tu piel actualmente.
        </p>
      </div>

      <div className="translucent-card">
        <div className="translucent-img">
          <Camera size={24} />
        </div>
        <div className="translucent-textbox">
          <div className="translucent-header">
            <h1 className="translucent-title">Análisis de Piel</h1>
            <span className="translucent-badge">Próximamente</span>
          </div>
          <p className="translucent-p">Tómate una foto para obtener una evaluación inteligente.</p>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "16px",
        marginBottom: "32px"
      }}>
        <SkinInfoCard profile={profile} onSave={saveProfile} />
        <GoalsSection profile={profile} onSave={saveProfile} />
        <RestrictionsSection profile={profile} onSave={saveProfile} />
        <DermatologicalHistorySection profile={profile} onSave={saveProfile} />
      </div>
    </div>
  );
}
