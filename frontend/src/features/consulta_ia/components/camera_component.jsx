import React, { useRef, useState, useEffect } from 'react';

export function WebcamCapture({ onCapture, capturedImage, onClear }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Iniciar el stream de la cámara web
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setCameraError("No pudimos acceder a tu cámara. Revisa los permisos de tu navegador.");
    }
  };

  // Detener el stream de la cámara web
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capturar fotograma del video actual
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      onCapture(imageDataUrl);
      stopCamera();
    }
  };

  // Limpiar imagen capturada o apagar cámara al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="webcam-capture-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <label style={{ fontFamily: 'Manrope, sans-serif', fontSize: '15px', fontWeight: 500, color: '#1D2825' }}>
        Fotografía del producto (Opcional)
      </label>

      {cameraError && (
        <div style={{ padding: '12px', backgroundColor: '#F9ECE8', border: '1px solid #C98268', borderRadius: '12px', color: '#C98268', fontSize: '14px', fontFamily: 'Manrope, sans-serif' }}>
          {cameraError}
        </div>
      )}

      {/* Contenedor de visualización (Cámara activa, Vista previa o Estado vacío) */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '240px',
        maxHeight: '360px',
        backgroundColor: '#F6F3EC',
        border: '1px solid #E7DFD2',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {capturedImage ? (
          // Vista previa de la foto capturada
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
            <img 
              src={capturedImage} 
              alt="Producto capturado" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '320px' }} 
            />
            <button
              type="button"
              onClick={onClear}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: '#163B35',
                color: '#F6F3EC',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontFamily: 'Manrope, sans-serif',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Borrar foto
            </button>
          </div>
        ) : isCameraActive ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '260px', objectFit: 'cover', backgroundColor: '#1D2825' }} 
            />
            <div style={{ position: 'absolute', bottom: '16px', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={capturePhoto}
                style={{
                  height: '44px',
                  padding: '0 20px',
                  backgroundColor: '#163B35',
                  color: '#F6F3EC',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Capturar foto
              </button>
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  height: '44px',
                  padding: '0 16px',
                  backgroundColor: 'transparent',
                  color: '#163B35',
                  border: '1px solid #163B35',
                  borderRadius: '12px',
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          // Estado inicial: Botón para activar cámara
          <div style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: '14px', color: '#1D2825', margin: 0, opacity: 0.8 }}>
              Toma una fotografía directa del empaque o lista de ingredientes.
            </p>
            <button
              type="button"
              onClick={startCamera}
              style={{
                height: '44px',
                padding: '0 24px',
                backgroundColor: '#2D6658',
                color: '#F6F3EC',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Manrope, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#163B35'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2D6658'}
            >
              Activar cámara
            </button>
          </div>
        )}
      </div>

      {/* Canvas oculto para procesar el fotograma */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
export default WebcamCapture;