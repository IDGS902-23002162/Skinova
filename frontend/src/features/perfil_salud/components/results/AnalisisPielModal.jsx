import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi';
import { createEvaluationApi } from '../../services/evaluationApi';

export default function AnalisisPielModal({
  isOpen,
  onClose,
  onSuccess,
  isOnboarding = false
}) {
  const { fetchConAuth } = useApi();
  const evaluationApi = createEvaluationApi(fetchConAuth);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [userDescription, setUserDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }

    setError(null);
    setImageMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = (e) => {
    e.stopPropagation();
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageBase64 && !userDescription.trim()) {
      setError('Sube una foto de tu rostro o describe las sensaciones de tu piel para poder analizarla.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await evaluationApi.analyzeSkin({
        imageBase64,
        imageMimeType,
        userDescription,
        applyToProfile: true,
        isOnboarding
      });

      setAnalysisResult(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al procesar el análisis de piel.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImagePreview(null);
    setImageBase64(null);
    setUserDescription('');
    setError(null);
    setAnalysisResult(null);
    onClose();
  };

  const skinTypeLabels = {
    normal: 'Normal',
    dry: 'Seca',
    oily: 'Grasa',
    combination: 'Mixta'
  };

  const sensitivityLabels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta'
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'var(--color-crema, #F6F3EC)',
          borderRadius: '24px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--color-arena, #E7DFD2)',
          padding: '28px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--color-carbon, #1D2825)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7
          }}
        >
          <X size={22} />
        </button>

        {!analysisResult ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h3 style={{
                margin: 0,
                fontFamily: 'var(--font-title, "DM Serif Display", serif)',
                fontSize: '1.6rem',
                color: 'var(--color-bosque-profundo, #163B35)'
              }}>
                Análisis de Piel con IA
              </h3>
            </div>

            <p style={{
              margin: '0 0 20px 0',
              fontSize: '0.92rem',
              color: 'var(--color-carbon, #1D2825)',
              opacity: 0.85,
              lineHeight: 1.5
            }}>
              Sube una fotografía de tu rostro y/o describe cómo sientes tu piel para generar una evaluación inteligente de sus 6 métricas y recomendaciones específicas.
            </p>

            {error && (
              <div style={{
                background: 'rgba(201, 130, 104, 0.15)',
                border: '1px solid rgba(201, 130, 104, 0.4)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-terracota, #C98268)',
                fontSize: '0.88rem',
                marginBottom: '16px'
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Zona de subida de imagen */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${imagePreview ? 'var(--color-bosque-medio, #2D6658)' : 'var(--color-arena, #E7DFD2)'}`,
                  borderRadius: '16px',
                  padding: imagePreview ? '12px' : '28px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: imagePreview ? 'transparent' : 'rgba(255, 255, 255, 0.4)',
                  marginBottom: '18px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {imagePreview ? (
                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <img
                      src={imagePreview}
                      alt="Vista previa de piel"
                      style={{
                        maxHeight: '200px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'var(--color-terracota, #C98268)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}
                    >
                      <X size={14} />
                    </button>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--color-bosque-medio, #2D6658)', fontWeight: 500 }}>
                      ✓ Imagen lista. Clic para cambiarla.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--color-arena, #E7DFD2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px auto',
                      color: 'var(--color-bosque-medio, #2D6658)'
                    }}>
                      <Camera size={24} />
                    </div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: 'var(--color-bosque-profundo, #163B35)', fontSize: '0.95rem' }}>
                      Tómate una foto o sube una imagen
                    </p>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--color-carbon, #1D2825)' }}>
                      Recomendamos buena luz natural y rostro limpio
                    </span>
                  </div>
                )}
              </div>

              {/* Zona de descripción / sensaciones */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--color-bosque-profundo, #163B35)',
                  marginBottom: '6px'
                }}>
                  ¿Qué sientes o notas en tu piel? (Opcional)
                </label>
                <textarea
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  placeholder="Ej: Siento tirantez después de lavarme, brillo en la zona T hacia el mediodía y a veces enrojecimiento en las mejillas..."
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid var(--color-arena, #E7DFD2)',
                    padding: '12px',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    color: 'var(--color-carbon, #1D2825)',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-arena, #E7DFD2)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    color: 'var(--color-carbon, #1D2825)',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || (!imageBase64 && !userDescription.trim())}
                  style={{
                    background: 'var(--color-bosque-medio, #2D6658)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: loading || (!imageBase64 && !userDescription.trim()) ? 'not-allowed' : 'pointer',
                    opacity: loading || (!imageBase64 && !userDescription.trim()) ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(45, 102, 88, 0.25)'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>Analizando con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Analizar Piel</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(169, 196, 181, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                color: 'var(--color-bosque-medio, #2D6658)'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{
                margin: 0,
                fontFamily: 'var(--font-title, "DM Serif Display", serif)',
                fontSize: '1.5rem',
                color: 'var(--color-bosque-profundo, #163B35)'
              }}>
                ¡Análisis de Piel Completado!
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', opacity: 0.8, color: 'var(--color-carbon, #1D2825)' }}>
                Resultados generados y guardados con éxito.
              </p>
            </div>

            {/* Clasificación rápida */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: '#fff',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--color-arena, #E7DFD2)'
              }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-bosque-medio, #2D6658)', fontWeight: 600 }}>
                  Tipo de Piel
                </span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-bosque-profundo, #163B35)' }}>
                  {skinTypeLabels[analysisResult.suggested_skin_type] || analysisResult.suggested_skin_type || 'Mixta'}
                </p>
              </div>

              <div style={{
                background: '#fff',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--color-arena, #E7DFD2)'
              }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-bosque-medio, #2D6658)', fontWeight: 600 }}>
                  Sensibilidad
                </span>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-bosque-profundo, #163B35)' }}>
                  {sensitivityLabels[analysisResult.suggested_sensitivity_level] || analysisResult.suggested_sensitivity_level || 'Media'}
                </p>
              </div>
            </div>

            {/* Observación / Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid var(--color-arena, #E7DFD2)',
              marginBottom: '20px'
            }}>
              <h4 style={{
                margin: '0 0 6px 0',
                fontSize: '0.95rem',
                color: 'var(--color-bosque-profundo, #163B35)',
                fontWeight: 600
              }}>
                Observación de la IA
              </h4>
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
                lineHeight: 1.5,
                color: 'var(--color-carbon, #1D2825)',
                opacity: 0.9
              }}>
                {analysisResult.summary}
              </p>
            </div>

            <button
              onClick={handleClose}
              style={{
                width: '100%',
                background: 'var(--color-bosque-profundo, #163B35)',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(22, 59, 53, 0.25)'
              }}
            >
              <span>{isOnboarding ? 'Aplicar a mi proceso de inicio' : 'Ver gráfica y resultados'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

