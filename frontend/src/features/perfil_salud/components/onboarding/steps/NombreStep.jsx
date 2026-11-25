import React, { useState, useRef } from 'react';
import { useUser } from '@clerk/react';
import { Camera, Loader2, Check } from 'lucide-react';

export default function NombreStep({ formData, updateData, onNext, onBack }) {
  const { user } = useUser();
  const [name, setName] = useState(formData.preferred_name || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const fileInputRef = useRef(null);

  const handleContinue = () => {
    if (name.trim()) {
      updateData({ preferred_name: name.trim() });
      onNext();
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingPhoto(true);
      // ponytail: usa directamente la API de Clerk para persistir la foto de perfil del usuario
      await user.setProfileImage({ file });
      setPhotoSaved(true);
    } catch (error) {
      console.error("Error al actualizar foto de perfil en Clerk:", error);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const avatarUrl = user?.imageUrl;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", width: "100%", maxWidth: "400px", margin: "0 auto" }}>
      <h2 style={{ 
        color: "var(--bosque-profundo, #163B35)", 
        fontFamily: "DM Serif Display, serif",
        fontSize: "2rem",
        marginBottom: "1rem"
      }}>
        ¿Cómo quieres que te llamemos?
      </h2>
      
      <p style={{ 
        color: "var(--carbon, #1D2825)", 
        fontSize: "1rem",
        marginBottom: "1.5rem",
        opacity: 0.8
      }}>
        Usaremos este nombre para hacer tu experiencia más cercana.
        <br />
        <span style={{ fontStyle: "italic", opacity: 0.6 }}>Ejemplo: Buenos días, Erick</span>
      </p>

      {/* Botón y preview de foto con Clerk */}
      <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          position: "relative",
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid var(--bosque-profundo, #163B35)",
          boxShadow: "0 4px 12px rgba(22, 59, 53, 0.15)",
          backgroundColor: "#E7DFD2"
        }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Foto de perfil"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bosque-profundo, #163B35)"
            }}>
              <Camera size={36} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handlePhotoClick}
          disabled={isUploadingPhoto}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(22, 59, 53, 0.08)",
            color: "var(--bosque-profundo, #163B35)",
            border: "1px dashed var(--bosque-profundo, #163B35)",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "0.9rem",
            fontWeight: "500",
            cursor: isUploadingPhoto ? "not-allowed" : "pointer",
            transition: "all 0.2s ease"
          }}
        >
          {isUploadingPhoto ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>Guardando foto...</span>
            </>
          ) : photoSaved ? (
            <>
              <Check size={16} color="#163B35" />
              <span>Foto actualizada ✓</span>
            </>
          ) : (
            <>
              <Camera size={16} />
              <span>Tómate una foto de perfil</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handlePhotoChange}
          style={{ display: "none" }}
        />
      </div>

      <input 
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre o apodo"
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid var(--arena, #E7DFD2)",
          fontSize: "1.1rem",
          backgroundColor: "#FAFAFA",
          color: "var(--carbon, #1D2825)",
          marginBottom: "3rem",
          outline: "none",
          transition: "border-color 0.2s ease"
        }}
        autoFocus
      />

      <div style={{ display: "flex", width: "100%", gap: "1rem" }}>
        <button 
          onClick={onBack}
          style={{
            flex: 1,
            background: "transparent",
            color: "var(--bosque-profundo, #163B35)",
            border: "1px solid var(--bosque-profundo, #163B35)",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          Atrás
        </button>
        <button 
          onClick={handleContinue}
          disabled={!name.trim()}
          style={{
            flex: 1,
            background: "var(--bosque-profundo, #163B35)",
            color: "var(--crema, #F6F3EC)",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5,
            transition: "all 0.2s ease"
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
