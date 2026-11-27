import React, { useState, useRef, useCallback } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useResultadosPiel } from '../../hooks/useResultadosPiel';
import ProgressDots from '../../../../shared/components/ProgressDots';
import FullScreenCameraOverlay from '../../../../shared/components/FullScreenCameraOverlay';
import SkinRadarChart from './SkinRadarChart';
import SkinMetricCard from './SkinMetricCard';
import EvaluationSummary from './EvaluationSummary';
import EvaluationEmptyState from './EvaluationEmptyState';

function ResultsSkeleton() {
  const pulse = {
    background: 'linear-gradient(90deg, rgba(231,223,210,0.45) 25%, rgba(231,223,210,0.85) 50%, rgba(231,223,210,0.45) 75%)',
    backgroundSize: '200% 100%',
    borderRadius: '16px',
    animation: 'pulse 1.6s ease-in-out infinite',
  };
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }} aria-busy="true" aria-live="polite">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--color-bosque-profundo, #163B35)', fontWeight: 600 }}>
        <Loader2 size={20} className="spin" />
        <span>Analizando tu piel con IA...</span>
      </div>
      <div className="desktop-top-section" style={{ gap: '20px' }}>
        <div className="desktop-top-left">
          <div style={{ ...pulse, width: '100%', height: '240px', borderRadius: '20px' }} />
        </div>
        <div className="desktop-top-right show-on-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...pulse, width: '100%', height: '120px' }} />
          <div style={{ ...pulse, width: '85%', height: '90px' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ ...pulse, height: '84px' }} />
        ))}
      </div>
    </div>
  );
}

const MotionCard = ({ children, delay = 0, style }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "0px 0px -50px 0px" }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    style={style}
  >
    {children}
  </motion.div>
);

export default function ResultsSection() {
  const { evaluations, loading, analyzing, error, handleAnalyzeSkin } = useResultadosPiel();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [openMetricKey, setOpenMetricKey] = useState(null);
  const carouselRef = useRef(null);

  const handlePhotoCaptured = async (imageBase64, imageMimeType) => {
    setIsCameraOpen(false);
    if (!imageBase64) return;
    try {
      await handleAnalyzeSkin({
        imageBase64,
        imageMimeType: imageMimeType || 'image/jpeg',
        userDescription: '',
        applyToProfile: true,
        isOnboarding: false,
      });
    } catch {
      // error state is handled by useResultadosPiel
    }
  };

  const currentEval = evaluations && evaluations.length > 0 ? evaluations[0] : null;

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

  const hasWarnings = currentEval ? (currentEval.warnings?.length > 0 || currentEval.requires_professional_attention) : false;
  const totalMobileSlides = 1 + chunkedMetricsMobile.length + (hasWarnings ? 1 : 0);

  const handleCarouselScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;

    const visibleChildren = Array.from(container.children).filter(c => c.offsetWidth > 0);
    if (visibleChildren.length === 0) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < visibleChildren.length; i++) {
      const child = visibleChildren[i];
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex !== activeSlide) {
      setActiveSlide(closestIndex);
      // Al cambiar de tarjeta deslizando, cerramos cualquier explicación abierta
      if (openMetricKey) {
        setOpenMetricKey(null);
      }
    } else if (openMetricKey) {
      // Si el usuario comienza a deslizar (> 25px respecto a la tarjeta actual), cerramos la explicación
      const currentChild = visibleChildren[activeSlide];
      if (currentChild) {
        const expectedCenter = currentChild.offsetLeft + currentChild.offsetWidth / 2;
        if (Math.abs(containerCenter - expectedCenter) > 25) {
          setOpenMetricKey(null);
        }
      }
    }
  }, [activeSlide, openMetricKey]);

  const handleDotClick = useCallback((index) => {
    setOpenMetricKey(null);
    setActiveSlide(index);
    const container = carouselRef.current;
    if (!container) return;
    const visibleChildren = Array.from(container.children).filter(c => c.offsetWidth > 0);
    const child = visibleChildren[index];
    if (!child) return;
    const targetScroll = child.offsetLeft - (container.clientWidth - child.offsetWidth) / 2;
    container.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  }, []);

  if (analyzing) {
    return <ResultsSkeleton />;
  }

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
        {error && (
          <div role="alert" style={{ margin: '0 24px 12px', padding: '12px 16px', borderRadius: '12px', background: '#F9ECE8', border: '1px solid #C98268', color: '#9A5A43', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <EvaluationEmptyState onStartAnalysis={() => setIsCameraOpen(true)} />
        <FullScreenCameraOverlay
          isOpen={isCameraOpen}
          facingMode="user"
          onCapture={handlePhotoCaptured}
          onClose={() => setIsCameraOpen(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && (
        <div role="alert" style={{ margin: '0 0 12px', padding: '12px 16px', borderRadius: '12px', background: '#F9ECE8', border: '1px solid #C98268', color: '#9A5A43', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <h3 style={{
        fontFamily: 'var(--font-title, "DM Serif Display", serif)',
        fontSize: '1.6rem',
        color: 'var(--color-bosque-profundo, #163B35)',
        margin: '0 0 4px 0',
        textAlign: 'center'
      }}>
        Tus Resultados
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
        <span style={{ opacity: 0.75, color: 'var(--color-carbon, #1D2825)', fontSize: '0.88rem', fontWeight: 500 }}>
          Análisis del {new Date(currentEval.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="desktop-top-section" style={{ marginTop: '0px' }}>
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

      <ProgressDots
        className="custom-profile-carousel-indicator"
        mode="carousel"
        totalSteps={totalMobileSlides}
        currentStep={activeSlide + 1}
        onDotClick={handleDotClick}
      />

      <div
        className="desktop-bottom-section custom-profile-carousel"
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        style={{ paddingBottom: '12px' }}
      >
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
                        isOpen={openMetricKey === m.key}
                        onToggle={() => setOpenMetricKey(openMetricKey === m.key ? null : m.key)}
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
                        isOpen={openMetricKey === m.key}
                        onToggle={() => setOpenMetricKey(openMetricKey === m.key ? null : m.key)}
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

      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        flexShrink: 0
      }}>
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          style={{
            width: '100%',
            maxWidth: '380px',
            background: 'linear-gradient(135deg, var(--color-bosque-profundo, #163B35), var(--color-bosque-medio, #2D6658))',
            color: 'var(--color-crema, #F6F3EC)',
            border: 'none',
            borderRadius: '16px',
            padding: '14px 24px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(22, 59, 53, 0.25)',
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 59, 53, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(22, 59, 53, 0.25)';
          }}
        >
          <Sparkles size={18} color="var(--color-crema, #F6F3EC)" />
          <span>Nuevo Análisis</span>
        </button>
      </div>

      <FullScreenCameraOverlay
        isOpen={isCameraOpen}
        facingMode="user"
        onCapture={handlePhotoCaptured}
        onClose={() => setIsCameraOpen(false)}
      />
    </div>
  );
}
