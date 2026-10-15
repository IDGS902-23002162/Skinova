import React, { useState, useRef, useEffect } from 'react';

export function AiChat({
  productText = '',
  onProductTextChange,
  capturedImage = null,
  onImageCaptured,
  onSubmit,
  onClearAll,
  labelProduct = 'Nombre del producto o ingrediente',
  labelCamera = 'Fotografía del producto (Opcional)'
}) {
  const [internalText, setInternalText] = useState(productText);
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'camera' | 'photo'
  const [errorMessage, setErrorMessage] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Sincronizar si cambia desde afuera
  useEffect(() => {
    setInternalText(productText);
  }, [productText]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setInternalText(val);
    if (onProductTextChange) {
      onProductTextChange(val);
    }
  };

  const startCamera = async () => {
    setErrorMessage('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Tu navegador no permite acceder a la cámara.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState('camera');
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setErrorMessage('No pudimos acceder a tu cámara. Revisa los permisos de tu navegador.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState(capturedImage ? 'photo' : 'idle');
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      if (onImageCaptured) {
        onImageCaptured(dataUrl);
      }
      stopCamera();
      setCameraState('photo');
    }
  };

  const clearPhoto = () => {
    if (onImageCaptured) {
      onImageCaptured(null);
    }
    setCameraState('idle');
  };

  const clearAllFields = (e) => {
    e.preventDefault();
    setInternalText('');
    stopCamera();
    clearPhoto();
    setErrorMessage('');
    if (onClearAll) {
      onClearAll();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="pa-wrapper">
      <style>{`
        .pa-wrapper {
          --pa-bg: #F6F3EC;
          --pa-surface: #FFFFFF;
          --pa-border: #E7DFD2;
          --pa-text: #1D2825;
          --pa-primary: #163B35;
          --pa-primary-hover: #2D6658;
          --pa-accent: #C98268;
          --pa-accent-bg: #F9ECE8;
          --pa-focus: rgba(169, 196, 181, 0.35);
          --pa-radius: 12px;
          --pa-font: 'Manrope', system-ui, -apple-system, sans-serif;
          
          width: 100%;
          background: transparent;
          font-family: var(--pa-font);
          color: var(--pa-text);
          box-sizing: border-box;
        }

        .pa-wrapper *, .pa-wrapper *::before, .pa-wrapper *::after {
          box-sizing: border-box;
        }

        .pa-form-inner {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .pa-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .pa-label {
          font-size: 15px;
          font-weight: 500;
          padding: 0;
        }

        .pa-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          background: var(--pa-surface);
          border: 1px solid var(--pa-border);
          border-radius: var(--pa-radius);
          font-family: inherit;
          font-size: 16px;
          color: var(--pa-text);
          outline: none;
          transition: border-color .2s ease, box-shadow .2s ease;
        }

        .pa-input::placeholder {
          color: rgba(29, 40, 37, .5);
        }

        .pa-input:focus {
          border-color: var(--pa-primary-hover);
          box-shadow: 0 0 0 3px var(--pa-focus);
        }

        .pa-error {
          padding: 12px;
          background: var(--pa-accent-bg);
          border: 1px solid var(--pa-accent);
          border-radius: var(--pa-radius);
          color: #9A5A43;
          font-size: 14px;
          line-height: 1.4;
        }

        .pa-stage {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          max-height: 60vh;
          background: var(--pa-bg);
          border: 1px solid var(--pa-border);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pa-stage[data-state="idle"] {
          aspect-ratio: auto;
          min-height: 200px;
        }

        .pa-view {
          display: none;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
        }

        .pa-stage[data-state="idle"] .pa-view--idle,
        .pa-stage[data-state="camera"] .pa-view--camera,
        .pa-stage[data-state="photo"] .pa-view--photo {
          display: flex;
        }

        .pa-view--idle {
          flex-direction: column;
          gap: 12px;
          padding: 32px 16px;
          text-align: center;
        }

        .pa-view--idle p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          opacity: .8;
          max-width: 36ch;
        }

        .pa-view--camera,
        .pa-view--photo {
          position: absolute;
          inset: 0;
        }

        .pa-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: var(--pa-text);
        }

        .pa-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          padding: 16px 12px;
          background: linear-gradient(to top, rgba(29, 40, 37, .55), transparent);
        }

        .pa-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 20px;
          border-radius: var(--pa-radius);
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          white-space: nowrap;
          transition: background-color .2s ease, border-color .2s ease, color .2s ease;
        }

        .pa-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--pa-focus);
        }

        .pa-btn--primary {
          background: var(--pa-primary);
          color: var(--pa-bg);
        }

        .pa-btn--primary:hover {
          background: var(--pa-primary-hover);
        }

        .pa-btn--secondary {
          background: var(--pa-primary-hover);
          color: var(--pa-bg);
        }

        .pa-btn--secondary:hover {
          background: var(--pa-primary);
        }

        .pa-btn--ghost {
          background: rgba(246, 243, 236, .92);
          color: var(--pa-primary);
          border-color: var(--pa-primary);
          font-weight: 500;
        }

        .pa-btn--outline {
          background: transparent;
          color: var(--pa-text);
          border-color: var(--pa-border);
          font-weight: 500;
        }

        .pa-btn--outline:hover {
          border-color: var(--pa-accent);
          color: var(--pa-accent);
        }

        .pa-clear-photo {
          position: absolute;
          top: 12px;
          right: 12px;
          height: 36px;
          padding: 0 12px;
          font-size: 13px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, .15);
        }

        .pa-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .pa-actions .pa-btn {
          width: 100%;
          height: 48px;
          font-size: 15px;
        }

        @media (min-width: 480px) {
          .pa-actions { flex-direction: row; gap: 16px; }
          .pa-actions .pa-btn--primary { flex: 2 1 0; }
          .pa-actions .pa-btn--outline { flex: 1 1 0; }
        }

        @media (max-width: 359px) {
          .pa-overlay .pa-btn { flex: 1 1 100%; }
        }
      `}</style>

      <div className="pa-form-inner">
        <div className="pa-field">
          <label className="pa-label" htmlFor="product-name-input">
            {labelProduct}
          </label>
          <input
            className="pa-input"
            id="product-name-input"
            name="product"
            type="text"
            autoComplete="off"
            placeholder="Ej. Crema hidratante con ceramidas..."
            value={internalText}
            onChange={handleTextChange}
          />
        </div>

        <fieldset className="pa-field">
          <legend className="pa-label">{labelCamera}</legend>

          {errorMessage && (
            <div className="pa-error" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="pa-stage" id="camera-stage" data-state={capturedImage ? 'photo' : cameraState}>
            <div className="pa-view pa-view--idle">
              <p>Toma una fotografía directa del empaque o lista de ingredientes.</p>
              <button type="button" className="pa-btn pa-btn--secondary" onClick={startCamera}>
                Activar cámara
              </button>
            </div>

            <div className="pa-view pa-view--camera">
              <video
                ref={videoRef}
                className="pa-media"
                autoPlay
                playsInline
                muted
                aria-label="Vista previa de la cámara"
              />
              <div className="pa-overlay">
                <button type="button" className="pa-btn pa-btn--primary" onClick={capturePhoto}>
                  Capturar foto
                </button>
                <button type="button" className="pa-btn pa-btn--ghost" onClick={stopCamera}>
                  Cancelar
                </button>
              </div>
            </div>

            <div className="pa-view pa-view--photo">
              {capturedImage && (
                <img src={capturedImage} className="pa-media" alt="Producto capturado" />
              )}
              <button type="button" className="pa-btn pa-btn--primary pa-clear-photo" onClick={clearPhoto}>
                Borrar foto
              </button>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </fieldset>

        <div className="pa-actions">
          <button type="button" className="pa-btn pa-btn--primary" onClick={onSubmit}>
            Analizar Foto
          </button>
          <button type="button" className="pa-btn pa-btn--outline" onClick={clearAllFields}>
            Borrar todo
          </button>
        </div>
      </div>
    </div>
  );
}

export default AiChat;