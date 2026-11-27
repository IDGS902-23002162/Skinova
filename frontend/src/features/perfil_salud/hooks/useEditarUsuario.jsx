import { useState, useEffect, useRef } from 'react';

export function useEditarUsuario({ user, profile, saveProfile, isOpen }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const displayTitle = profile?.preferred_name || 'Usuario';

  useEffect(() => {
    if (profile?.preferred_name) {
      setEditedName(profile.preferred_name);
    }
  }, [profile?.preferred_name]);

  useEffect(() => {
    if (isOpen) {
      setIsEditingName(false);
      setEditedName(profile?.preferred_name || '');
    }
  }, [isOpen, profile?.preferred_name]);

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
    if (!file || !user) return;

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

  return {
    displayTitle,
    editedName,
    setEditedName,
    isEditingName,
    setIsEditingName,
    isSavingName,
    handleSaveName,
    isUploadingPhoto,
    fileInputRef,
    handlePhotoClick,
    handlePhotoChange
  };
}
