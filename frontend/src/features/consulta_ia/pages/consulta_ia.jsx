import React, { useState } from 'react';
import { ProductInput } from '../components/input_component';
import { WebcamCapture } from '../components/camera_component';
import MainLayout from '../../../shared/components/MainLayout';
import { ActionButtons } from '../components/buttons_component';

export function ConsultaIaView() {
  const [productName, setProductName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const handleClearAll = () => {
    setProductName('');
    setCapturedImage(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Enviando consulta con:", { productName, capturedImage });
    // Lógica para enviar a la API de análisis de SKINOVA
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '680px',
      margin: '0 auto',
      // Padding fluido y responsivo (menos padding en móviles, más en escritorios)
      padding: 'clamp(16px, 5vw, 32px) clamp(12px, 4vw, 24px)',
      backgroundColor: '#F6F3EC',
      borderRadius: '20px',
      border: '1px solid #E7DFD2',
      boxShadow: '0 8px 24px rgba(22, 59, 53, 0.04)',
      fontFamily: 'Manrope, sans-serif',
      boxSizing: 'border-box', // Evita que los paddings desborden el ancho del contenedor
    }}>
        <MainLayout>
            <h2 style={{
              fontFamily: 'Fraunces, serif',
              // Tipografía fluida que se ajusta automáticamente según la pantalla
              fontSize: 'clamp(22px, 4vw, 28px)',
              fontWeight: 500,
              color: '#163B35',
              marginTop: 0,
              marginBottom: 'clamp(16px, 3vw, 24px)',
              lineHeight: '1.2',
              textAlign: 'left' // O 'center' si prefieres centrarlo en móviles
            }}>
              Consulta de Producto
            </h2>

            <form onSubmit={handleSubmit} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'clamp(16px, 3vw, 24px)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Componente 1: Input de texto */}
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <ProductInput 
                    value={productName} 
                    onChange={setProductName} 
                />
              </div>

              {/* Componente 2: Acceso a Webcam */}
              <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                <WebcamCapture 
                    capturedImage={capturedImage}
                    onCapture={setCapturedImage}
                    onClear={() => setCapturedImage(null)}
                />
              </div>

              {/* Componente 3: Botones de Acción */}
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <ActionButtons 
                    onSubmit={handleSubmit}
                    onClear={handleClearAll}
                />
              </div>
            </form>
        </MainLayout>
    </div>
  );
}

export default ConsultaIaView;