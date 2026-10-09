import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/react';
import { X, Camera, Edit2, Check, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileData } from '../../hooks/useProfileData';
import SkinInfoCard from './SkinInfoCard';
import GoalsSection from './GoalsSection';
import RestrictionsSection from './RestrictionsSection';
import DermatologicalHistorySection from './DermatologicalHistorySection';
import './CardTranslucent.css';
import './CustomProfileModal.css';
import { useApi } from '../../../../shared/hooks/useApi';

import SkinRadarChart from '../results/SkinRadarChart';
import SkinMetricCard from '../results/SkinMetricCard';
import EvaluationSummary from '../results/EvaluationSummary';
import EvaluationEmptyState from '../results/EvaluationEmptyState';

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

export default function CustomProfileModal({ isOpen, onClose }) {
  const { user } = useUser();
  const { profile, loading, saveProfile } = useProfileData();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'resultados'

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsEditingName(false);
      setActiveTab('perfil');
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (profile?.preferred_name) {
      setEditedName(profile.preferred_name);
    }
  }, [profile?.preferred_name]);

  if (!isOpen) return null;

  const emailAddress = user?.primaryEmailAddress?.emailAddress;
  const avatarUrl = user?.imageUrl || '';
  const displayTitle = profile?.preferred_name || 'Usuario';

  const handleSaveName = async () => {
    if (editedName.trim() === '') return;
    setIsSavingName(true);
    await saveProfile({ preferred_name: editedName.trim() });
    setIsSavingName(false);
    setIsEditingName(false);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      await user.setProfileImage({ file });
    } catch (error) {
      console.error("Error al subir foto:", error);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            />
                            <button className="custom-profile-name-save-btn" onClick={handleSaveName} disabled={isSavingName}>
                              {isSavingName ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
                            </button>
                          </div>
                        ) : (
                          <>
                            <h2 className="custom-profile-name">
                              {displayTitle}
                            </h2>
                            <button className="custom-profile-name-edit-btn" onClick={() => setIsEditingName(true)}>
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
                left: '116px', // Offset slightly overlapping the first tab
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

// Inline ResultsSection to handle fetching and layout cleanly
function ResultsSection() {
  const { fetchConAuth } = useApi();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadEvaluations = async () => {
      try {
        const response = await fetchConAuth('/perfil-salud/evaluations');
        if (response.ok) {
          const data = await response.json();
          setEvaluations(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateMock = async () => {
    try {
      setLoading(true);
      await fetchConAuth('/perfil-salud/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          metrics: {
            oiliness: { score: 78, level: "high", explanation: "Se observa una presencia elevada de brillo en zona T." },
            dryness: { score: 25, level: "low", explanation: "No se observan signos importantes de descamación o resequedad." },
            sensitivity: { score: 72, level: "high", explanation: "Ligera tendencia al enrojecimiento al contacto." },
            redness: { score: 48, level: "moderate", explanation: "Presencia moderada de tono rojizo en mejillas." },
            texture: { score: 63, level: "moderate", explanation: "Textura irregular en algunas zonas específicas." },
            imperfections: { score: 55, level: "moderate", explanation: "Algunos poros dilatados y pequeñas imperfecciones visibles." }
          },
          summary: "Tu piel muestra una tendencia clara a la producción de sebo en la zona T, combinada con signos de sensibilidad en las mejillas. Es importante mantener un balance.",
          warnings: ["Evita usar exfoliantes físicos fuertes debido a la sensibilidad detectada."],
          requires_professional_attention: false,
          ai_provider: "mock",
          ai_model: "mock"
        })
      });
      const response = await fetchConAuth('/perfil-salud/evaluations');
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--bosque-profundo, #163B35)" }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px auto' }} />
        <p>Cargando resultados...</p>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div style={{ position: 'relative' }}>
        <EvaluationEmptyState />
        {/* Development only button */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleCreateMock}
            style={{ position: 'absolute', bottom: 16, right: 16, fontSize: '0.8rem', padding: '4px 8px' }}
          >
            Mock Data
          </button>
        )}
      </div>
    );
  }

  const currentEval = evaluations[0];
  const metricKeys = [
    { key: 'oiliness', label: 'Grasosidad' },
    { key: 'dryness', label: 'Resequedad' },
    { key: 'sensitivity', label: 'Sensibilidad' },
    { key: 'redness', label: 'Rojeces' },
    { key: 'texture', label: 'Textura' },
    { key: 'imperfections', label: 'Imperfecciones' }
  ];

  // Agrupar métricas de 2 en 2 para móvil
  const chunkedMetricsMobile = [];
  for (let i = 0; i < metricKeys.length; i += 2) {
    chunkedMetricsMobile.push(metricKeys.slice(i, i + 2));
  }

  // Agrupar métricas de 3 en 3 para desktop
  const chunkedMetricsDesktop = [];
  for (let i = 0; i < metricKeys.length; i += 3) {
    chunkedMetricsDesktop.push(metricKeys.slice(i, i + 3));
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{
        fontFamily: 'var(--font-title, "DM Serif Display", serif)',
        fontSize: '1.6rem',
        color: 'var(--color-bosque-profundo, #163B35)',
        margin: '0 0 8px 0',
        textAlign: 'center'
      }}>
        Tus Resultados
      </h3>
      <p style={{ textAlign: 'center', opacity: 0.8, color: 'var(--color-carbon, #1D2825)', margin: '0 0 16px 0', fontSize: '0.9rem' }}>
        Análisis del {new Date(currentEval.created_at).toLocaleDateString()}
      </p>

      <div className="desktop-top-section" style={{ marginTop: '16px' }}>
        <div className="desktop-top-left">
          <div style={{ width: '100%' }}>
            <SkinRadarChart metrics={currentEval.metrics} />
          </div>
        </div>

        <div className="desktop-top-right show-on-desktop">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <EvaluationSummary
              summary={currentEval.summary}
              variant="summary"
            />
            {(currentEval.warnings?.length > 0 || currentEval.requires_professional_attention) && (
              <EvaluationSummary
                warnings={currentEval.warnings}
                requiresProfessionalAttention={currentEval.requires_professional_attention}
                variant="warnings"
              />
            )}
          </div>
        </div>
      </div>

      <p className="custom-profile-carousel-indicator" style={{
        textAlign: 'center',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        color: 'var(--color-bosque-medio, #2D6658)',
        opacity: 0.8,
        marginTop: '16px',
        marginBottom: '12px',
        textTransform: 'uppercase'
      }}>
        ← Desliza para ver más →
      </p>

      <div className="desktop-bottom-section custom-profile-carousel" style={{ paddingBottom: '24px' }}>
        <div className="hide-on-desktop">
          <MotionCard delay={0}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 4px' }}>
              <EvaluationSummary
                summary={currentEval.summary}
                variant="summary"
              />
            </div>
          </MotionCard>
        </div>

        {chunkedMetricsMobile.map((chunk, idx) => (
          <div className="hide-on-desktop" key={`mobile-chunk-${idx}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <MotionCard delay={0.1 * (idx + 1)} style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 4px' }}>
                <h4 style={{
                  fontFamily: 'var(--font-title, "DM Serif Display", serif)',
                  fontSize: '1.2rem',
                  color: 'var(--color-bosque-profundo, #163B35)',
                  margin: '0 0 16px 0',
                  paddingLeft: '4px'
                }}>
                  Detalles ({idx + 1}/{chunkedMetricsMobile.length})
                </h4>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {chunk.map(m => {
                    const mData = currentEval.metrics[m.key];
                    if (!mData) return null;
                    return (
                      <SkinMetricCard
                        key={m.key}
                        name={m.label}
                        score={mData.score}
                        level={mData.level}
                        explanation={mData.explanation}
                      />
                    );
                  })}
                </div>
              </div>
            </MotionCard>
          </div>
        ))}

        {chunkedMetricsDesktop.map((chunk, idx) => (
          <div className="show-on-desktop" key={`desktop-chunk-${idx}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <MotionCard delay={0.1 * (idx + 1)} style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 4px' }}>
                <h4 style={{
                  fontFamily: 'var(--font-title, "DM Serif Display", serif)',
                  fontSize: '1.2rem',
                  color: 'var(--color-bosque-profundo, #163B35)',
                  margin: '0 0 16px 0',
                  paddingLeft: '4px'
                }}>
                  Detalles ({idx + 1}/{chunkedMetricsDesktop.length})
                </h4>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {chunk.map(m => {
                    const mData = currentEval.metrics[m.key];
                    if (!mData) return null;
                    return (
                      <SkinMetricCard
                        key={m.key}
                        name={m.label}
                        score={mData.score}
                        level={mData.level}
                        explanation={mData.explanation}
                      />
                    );
                  })}
                </div>
              </div>
            </MotionCard>
          </div>
        ))}

        <div className="hide-on-desktop" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {(currentEval.warnings?.length > 0 || currentEval.requires_professional_attention) && (
            <MotionCard delay={0.1 * (chunkedMetricsMobile.length + 1)} style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 4px' }}>
                <h4 style={{
                  fontFamily: 'var(--font-title, "DM Serif Display", serif)',
                  fontSize: '1.2rem',
                  color: 'var(--color-bosque-profundo, #163B35)',
                  margin: '0 0 16px 0',
                  paddingLeft: '4px'
                }}>
                  Alertas
                </h4>
                <EvaluationSummary
                  warnings={currentEval.warnings}
                  requiresProfessionalAttention={currentEval.requires_professional_attention}
                  variant="warnings"
                />
              </div>
            </MotionCard>
          )}
        </div>
      </div>
    </div>
  );
}
