import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/react';
import { X, Camera, Edit2, Check, Loader2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProfileData } from '../../hooks/useProfileData';
import SkinInfoCard from './SkinInfoCard';
import GoalsSection from './GoalsSection';
import RestrictionsSection from './RestrictionsSection';
import DermatologicalHistorySection from './DermatologicalHistorySection';
import './CardTranslucent.css';
import './CustomProfileModal.css';

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsEditingName(false);
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

      <div className="custom-profile-modal" onClick={e => e.stopPropagation()}>
        <div className="custom-profile-scroll-container">
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

          <div className="custom-profile-content">
            {loading ? (
              <div style={{ textAlign: "center", color: "var(--bosque-profundo, #163B35)" }}>Cargando...</div>
            ) : !profile ? (
              <div style={{ textAlign: "center", color: "var(--terracota, #C98268)" }}>Error cargando perfil.</div>
            ) : (
              <>
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
    </div>
  );
}
