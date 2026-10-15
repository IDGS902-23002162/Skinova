import React, { useState } from 'react';
import AiChat from '../../../shared/components/AiChat';
import MainLayout from '../../../shared/components/MainLayout';

export function ConsultaIaView() {
  const [productName, setProductName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const handleClearAll = () => {
    setProductName('');
    setCapturedImage(null);
  };

  const handleSubmit = () => {
    console.log("Enviando consulta con:", { productName, capturedImage });
    // TODO: Lógica para enviar a la API de análisis de SKINOVA con `productName` y `capturedImage`
  };

  return (
    <MainLayout>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(16px, 5vw, 32px) clamp(12px, 4vw, 24px)',
        backgroundColor: '#F6F3EC',
        borderRadius: '20px',
        border: '1px solid #E7DFD2',
        boxShadow: '0 8px 24px rgba(22, 59, 53, 0.04)',
        fontFamily: 'Manrope, sans-serif',
        boxSizing: 'border-box',
      }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(22px, 4vw, 28px)',
          fontWeight: 500,
          color: '#163B35',
          marginTop: 0,
          marginBottom: 'clamp(16px, 3vw, 24px)',
          lineHeight: '1.2',
          textAlign: 'left'
        }}>
          Consulta de Producto
        </h2>

        <AiChat
          productText={productName}
          onProductTextChange={setProductName}
          capturedImage={capturedImage}
          onImageCaptured={setCapturedImage}
          onSubmit={handleSubmit}
          onClearAll={handleClearAll}
          labelProduct="Nombre del producto o ingrediente"
          labelCamera="Fotografía del producto (Opcional)"
        />
      </div>
    </MainLayout>
  );
}

export default ConsultaIaView;