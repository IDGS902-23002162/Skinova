import React, { useState } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useResultadosPiel } from '../../hooks/useResultadosPiel';
import SkinRadarChart from './SkinRadarChart';
import SkinMetricCard from './SkinMetricCard';
import EvaluationSummary from './EvaluationSummary';
import EvaluationEmptyState from './EvaluationEmptyState';
import AnalisisPielModal from './AnalisisPielModal';

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
  const { evaluations, loading, loadEvaluations, handleCreateMock } = useResultadosPiel();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <EvaluationEmptyState onStartAnalysis={() => setIsModalOpen(true)} />
        <AnalisisPielModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            loadEvaluations();
          }}
        />
        {/* Development only button
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleCreateMock}
            style={{ position: 'absolute', bottom: 16, right: 16, fontSize: '0.8rem', padding: '4px 8px' }}
          >
            Mock Data
          </button>
        )} */}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ opacity: 0.8, color: 'var(--color-carbon, #1D2825)', fontSize: '0.9rem' }}>
          Análisis del {new Date(currentEval.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            border: '1px solid var(--color-bosque-medio, #2D6658)',
            color: 'var(--color-bosque-profundo, #163B35)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={14} color="var(--color-bosque-medio, #2D6658)" />
          Nuevo Análisis
        </button>
      </div>

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

      <AnalisisPielModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadEvaluations();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
