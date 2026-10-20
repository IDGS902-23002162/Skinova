import React, { useState, useRef, useEffect } from 'react';
import "../styles/ai_chat_style.css";

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
      <div className="pa-form-inner">
        {/* Input de texto */}
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

        {/* Sección de Cámara */}
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

        {/* Botones de Acción */}
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