import React from 'react';
import { useUser } from '@clerk/react';
import { X, Camera, Edit2, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProfileData } from '../hooks/useProfileData';
import { useControlModalPerfil } from '../hooks/useControlModalPerfil';
import { useEditarUsuario } from '../hooks/useEditarUsuario';
import SkinInfoCard from '../components/profile/SkinInfoCard';
import GoalsSection from '../components/profile/GoalsSection';
import RestrictionsSection from '../components/profile/RestrictionsSection';
import DermatologicalHistorySection from '../components/profile/DermatologicalHistorySection';
import ResultsSection from '../components/results/ResultsSection';
import '../components/profile/CardTranslucent.css';
import '../components/profile/CustomProfileModal.css';

const MotionCard = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "0px 0px -50px 0px" }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function ProfilePage({ isOpen, onClose }) {
  const { user } = useUser();
  const { profile, loading, saveProfile } = useProfileData();
  const { activeTab, setActiveTab } = useControlModalPerfil({ isOpen });
  const {
    displayTitle,
    editedName,
    setEditedName,
    isEditingName,
    setIsEditingName,
    isSavingName,
    handleSaveName,
    isUploadingPhoto,
    fileInputRef,
    handlePhotoClick,
    handlePhotoChange
  } = useEditarUsuario({ user, profile, saveProfile, isOpen });

  if (!isOpen) return null;

  const emailAddress = user?.primaryEmailAddress?.emailAddress;
  const avatarUrl = user?.imageUrl || '';

  return (
    <div className="custom-profile-overlay" onClick={onClose}>
      <button className="custom-profile-close-external" onClick={onClose}>
        <X size={24} />
      </button>

      <div className="custom-profile-wrapper" onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative', width: '100%', perspective: '1500px', marginTop: '24px' }}>

          {/* PERFIL CARD */}
          <motion.div
            className="custom-profile-modal"
            animate={activeTab === 'perfil'
              ? { x: 0, scale: 1, zIndex: 10, filter: 'brightness(1)' }
              : { x: 0, scale: 0.95, zIndex: 9, filter: 'brightness(0.85)' }}
            transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
            style={{
              width: '100%',
              position: activeTab === 'perfil' ? 'relative' : 'absolute',
              top: 0, left: 0,
              transformOrigin: 'top center'
            }}
          >
            <div
              className={`folder-tab ${activeTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('perfil')}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                margin: 0,
                borderRadius: '24px 24px 0 0'
              }}
            >
              Mi Perfil
            </div>

            <div className="custom-profile-body" style={{ borderRadius: '0 32px 32px 32px' }}>
              <div className="custom-profile-scroll-container" style={{ overflowX: 'hidden' }}>
                <div className="desktop-top-section">
                  <div className="desktop-top-left">
                    <div className="custom-profile-hero">
                      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '24px', overflow: 'hidden' }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="custom-profile-hero-image" />
                        ) : (
                          <div className="custom-profile-hero-placeholder" />
                        )}

                        <button className="custom-profile-camera-fab" onClick={handlePhotoClick}>
                          {isUploadingPhoto ? (
                            <Loader2 size={20} className="spin" />
                          ) : (
                            <Camera size={20} />
                          )}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="desktop-top-right">
                    <div className="custom-profile-info-section">
                      <div className="custom-profile-name-row">
                        {isEditingName ? (
                          <div className="custom-profile-name-edit">
                            <input
                              type="text"
                              value={editedName}
                              onChange={e => setEditedName(e.target.value)}
                              className="custom-profile-name-input"
                              autoFocus
                              placeholder="Tu nombre"
                              maxLength={35}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName();
                                if (e.key === 'Escape') {
                                  setEditedName(displayTitle);
                                  setIsEditingName(false);
                                }
                              }}
                            />
                            <div className="custom-profile-name-actions">
                              <button
                                type="button"
                                className="custom-profile-name-cancel-btn"
                                onClick={() => {
                                  setEditedName(displayTitle);
                                  setIsEditingName(false);
                                }}
                                disabled={isSavingName}
                                title="Cancelar edición"
                                aria-label="Cancelar edición"
                              >
                                <X size={16} />
                              </button>
                              <button
                                type="button"
                                className="custom-profile-name-save-btn"
                                onClick={handleSaveName}
                                disabled={isSavingName || !editedName.trim()}
                                title="Guardar cambios"
                                aria-label="Guardar cambios"
                              >
                                {isSavingName ? (
                                  <Loader2 size={16} className="spin" />
                                ) : (
                                  <>
                                    <Check size={16} strokeWidth={2.5} />
                                    <span className="custom-profile-name-save-text">Guardar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h2 className="custom-profile-name">
                              {displayTitle}
                            </h2>
                            <button
                              type="button"
                              className="custom-profile-name-edit-btn"
                              onClick={() => {
                                setEditedName(displayTitle);
                                setIsEditingName(true);
                              }}
                              title="Editar nombre"
                              aria-label="Editar nombre"
                            >
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>

                      <p className="custom-profile-bio">
                        {emailAddress && <span>{emailAddress}</span>}
                      </p>
                    </div>

                    <div style={{ padding: '0 24px 0 24px' }}>
                      <MotionCard delay={0}>
                        <div className="translucent-card" style={{ marginBottom: '16px' }}>
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
                      </MotionCard>
                    </div>
                  </div>
                </div>

                <div className="desktop-bottom-section custom-profile-content">
                  {loading ? (
                    <div style={{ textAlign: "center", color: "var(--bosque-profundo, #163B35)", padding: "24px" }}>Cargando...</div>
                  ) : !profile ? (
                    <div style={{ textAlign: "center", color: "var(--terracota, #C98268)", padding: "24px" }}>Error cargando perfil.</div>
                  ) : (
                    <>
                      <div className="custom-profile-carousel-indicator">
                        ← Desliza para ver más →
                      </div>

                      <div className="custom-profile-carousel">
                        <MotionCard delay={0.1}>
                          <SkinInfoCard profile={profile} onSave={saveProfile} />
                        </MotionCard>

                        <MotionCard delay={0.2}>
                          <GoalsSection profile={profile} onSave={saveProfile} />
                        </MotionCard>

                        <MotionCard delay={0.3}>
                          <RestrictionsSection profile={profile} onSave={saveProfile} />
                        </MotionCard>

                        <MotionCard delay={0.4}>
                          <DermatologicalHistorySection profile={profile} onSave={saveProfile} />
                        </MotionCard>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* RESULTADOS CARD */}
          <motion.div
            className="custom-profile-modal"
            animate={activeTab === 'resultados'
              ? { x: 0, scale: 1, zIndex: 10, filter: 'brightness(1)' }
              : { x: 0, scale: 0.95, zIndex: 9, filter: 'brightness(0.85)' }}
            transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
            style={{
              width: '100%',
              position: activeTab === 'resultados' ? 'relative' : 'absolute',
              top: 0, left: 0,
              transformOrigin: 'top center'
            }}
          >
            <div
              className={`folder-tab ${activeTab === 'resultados' ? 'active' : ''}`}
              onClick={() => setActiveTab('resultados')}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '116px',
                margin: 0,
                borderRadius: '24px 24px 0 0'
              }}
            >
              Resultados
            </div>

            <div className="custom-profile-body" style={{ borderRadius: '32px 32px 32px 32px' }}>
              <div className="custom-profile-scroll-container" style={{ overflowX: 'hidden' }}>
                <ResultsSection />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// Alias para mantener compatibilidad
export const CustomProfileModal = ProfilePage;
